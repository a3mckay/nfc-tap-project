"use server";

import {
  getPool, upsertFullEnrichment, getProductById, updateManualProduct, getBrandWebsite, setBrandWebsite,
  replaceResearchedFacts, saveReviewFlags, type Review, type FaqItem,
} from "@nfc/db";
import { checkProductNotes } from "@/lib/check-product.js";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";
import {
  parseReasonsInput,
  parseExtraImagesInput,
} from "../../../src/enrichment-utils.js";
import Anthropic from "@anthropic-ai/sdk";
import { braveSearch } from "../../../lib/public-reviews/search.js";
import {
  findBrandDomain, researchProduct, sourcesForPrompt, factsFromModel, fetchPageText, FACT_TOPICS,
  type ResearchDeps, type ResearchSource,
} from "@/lib/product-research.js";

export interface EnrichmentFormData {
  shop: string;
  product_id: string;
  is_manual: boolean;
  product_title: string;
  primary_image_url: string;
  backstory: string;
  fit_notes: string;
  materials: string;
  care_instructions: string;
  sustainability_notes: string;
  reasons_to_buy_text: string;
  staff_quote: string;
  staff_name: string;
  staff_photo_url: string;
  video_url: string;
  extra_images_text: string;
  reviews: Review[];
  awards_text: string;
  faq: FaqItem[];
  internal_staff_notes: string;
  great_when_text: string;   // one key point per line, up to 3
}

const MAX_GREAT_WHEN = 3;

export async function saveEnrichmentAction(
  data: EnrichmentFormData,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });

  const store = await getActionStore(pool, data.shop, "content");
  if (!store) return { error: "Store not found" };

  const product = await getProductById(pool, data.product_id);
  if (!product || product.store_id !== store.id) return { error: "Product not found" };

  // Update mutable product fields (title + primary image) for manual products
  await updateManualProduct(pool, data.product_id, {
    ...(data.is_manual && data.product_title.trim() ? { title: data.product_title.trim() } : {}),
    primaryImageUrl: data.primary_image_url.trim() || null,
  });

  await upsertFullEnrichment(pool, {
    product_id: data.product_id,
    backstory: data.backstory.trim() || null,
    fit_notes: data.fit_notes.trim() || null,
    materials: data.materials.trim() || null,
    care_instructions: data.care_instructions.trim() || null,
    sustainability_notes: data.sustainability_notes.trim() || null,
    reasons_to_buy: parseReasonsInput(data.reasons_to_buy_text),
    staff_quote: data.staff_quote.trim() || null,
    staff_name: data.staff_name.trim() || null,
    staff_photo_url: data.staff_photo_url.trim() || null,
    video_url: data.video_url.trim() || null,
    extra_images: parseExtraImagesInput(data.extra_images_text),
    reviews: data.reviews,
    awards: parseReasonsInput(data.awards_text),
    faq: data.faq,
    internal_staff_notes: data.internal_staff_notes.trim() || null,
    great_when: parseReasonsInput(data.great_when_text).slice(0, MAX_GREAT_WHEN),
  });

  await checkProductNotes(pool, store.id, data.product_id);   // Step 15k (D49)
  revalidatePath("/enrichment");
  return {};
}

export interface GeneratedDraft {
  backstory: string;
  materials: string;
  fit_notes: string;
  care_instructions: string;
  sustainability_notes: string;
  reasons_to_buy: string[];
  staff_quote: string;
  faq: FaqItem[];
  video_url: string;
  great_when: string[];
  facts?: Array<{ topic: string; fact: string; source: number }>;
  mismatches?: string[];
}

export async function generateEnrichmentAction(
  shop: string,
  productId: string,
): Promise<{ draft?: GeneratedDraft; error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "content");
  if (!store) return { error: "Store not found" };

  const product = await getProductById(pool, productId);
  if (!product || product.store_id !== store.id) return { error: "Product not found" };

  if (!process.env.ANTHROPIC_API_KEY) return { error: "ANTHROPIC_API_KEY is not set" };

  const client = new Anthropic();

  const productContext = [
    `Title: ${product.title}`,
    product.vendor ? `Brand: ${product.vendor}` : null,
    product.product_type ? `Type: ${product.product_type}` : null,
    product.description_html
      ? `Description: ${product.description_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800)}`
      : null,
  ].filter(Boolean).join("\n");

  // Research the product, brand's own site first (PRD v4 §7 Step 15b). Every
  // source is numbered so the facts the model returns can cite one.
  let webContext = "";
  let youtubeUrl = "";
  let sources: ResearchSource[] = [];
  if (process.env.BRAVE_SEARCH_API_KEY) {
    const deps: ResearchDeps = { search: braveSearch, fetchText: fetchPageText };
    try {
      const known = product.vendor ? await getBrandWebsite(pool, store.id, product.vendor) : null;
      const brand = product.vendor ? await findBrandDomain(product.vendor, known?.website ?? null, deps) : null;
      if (brand?.found && product.vendor) {
        await setBrandWebsite(pool, store.id, product.vendor, `https://${brand.domain}`, false);
      }
      const query = [product.vendor, product.title].filter(Boolean).join(" ");
      const [found, ytResults] = await Promise.all([
        researchProduct(product, brand?.domain ?? null, deps),
        braveSearch(`${query} site:youtube.com`, 3),
      ]);
      sources = found;
      if (sources.length > 0) {
        webContext = "\n\nNumbered sources about this product. Brand sources are the most trusted; ground your copy in them and don't invent facts:\n" +
          sourcesForPrompt(sources);
      }
      // Find the first proper YouTube watch URL
      const ytMatch = ytResults.find((r) => r.url.includes("youtube.com/watch"));
      if (ytMatch) youtubeUrl = ytMatch.url;
    } catch {
      // Search failed — proceed without web context
    }
  }

  let result;
  try {
    result = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4000,
    tools: [{
      name: "submit_product_copy",
      description: "Submit concise product copy for an in-store NFC tap page. Every field must be SHORT — customers are reading on a phone they just pulled out. No fluff, no generic marketing speak.",
      input_schema: {
        type: "object" as const,
        properties: {
          backstory: { type: "string", description: "1-2 sentences max. Brand origin or what makes this specific product special. Be concrete, not vague." },
          materials: { type: "string", description: "One sentence. Key material(s) and one standout construction detail. No padding." },
          fit_notes: { type: "string", description: "One sentence on sizing, fit, or styling. Empty string if not clothing/footwear/accessories." },
          care_instructions: { type: "string", description: "One plain sentence, e.g. 'Machine wash cold, reshape and air dry.'" },
          sustainability_notes: { type: "string", description: "One sentence if genuinely applicable. Empty string if nothing meaningful is known." },
          reasons_to_buy: { type: "array", items: { type: "string" }, description: "3-4 bullet points, max 7 words each. Each must be a specific, different reason." },
          staff_quote: { type: "string", description: "One punchy first-person sentence a real staff member might say. No clichés." },
          video_url: { type: "string", description: `YouTube URL for a brand or product video. Use this URL if it looks relevant: ${youtubeUrl || "(none found)"}. Otherwise leave empty string.` },
          faq: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string", description: "1-2 sentences max." },
              },
              required: ["question", "answer"],
            },
            description: "2-3 questions a customer might actually ask in store. Answers must be brief.",
          },
          great_when: {
            type: "array",
            items: { type: "string" },
            description: "Exactly 3 short phrases that complete the sentence 'Great when…', naming the situation or problem this product is for (e.g. 'you need one boot from office to bar'). Max 10 words each. Don't repeat 'Great when'. No upselling.",
          },
          facts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string", enum: [...FACT_TOPICS] },
                fact: { type: "string", description: "One specific, checkable fact about this exact product, in a short sentence." },
                source: { type: "integer", description: "The number of the source this fact comes from." },
              },
              required: ["topic", "fact", "source"],
            },
            description: "Up to 12 facts about this product that are stated in the numbered sources, each citing its source number. Prefer brand sources. Leave out anything no source states. Empty array if there are no sources.",
          },
          mismatches: {
            type: "array",
            items: { type: "string" },
            description: "Findings in the sources that don't fit this product's title or type (e.g. a source describes a sleeveless top but this is a shirt, or a different colourway or model), which you left out of the copy and facts. One short sentence each. Empty array if none.",
          },
        },
        required: ["backstory", "materials", "fit_notes", "care_instructions", "sustainability_notes", "reasons_to_buy", "staff_quote", "video_url", "faq", "great_when", "facts", "mismatches"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_product_copy" },
    messages: [{
      role: "user",
      content: `Generate SHORT, punchy in-store NFC tap page copy for this retail product:\n\n${productContext}${webContext}\n\nIMPORTANT: Keep every field brief — customers are on their phone in a store. Ground copy in the web research where provided; don't invent facts.`,
    }],
  });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `AI request failed: ${msg}` };
  }

  const toolUse = result.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { error: "AI generation failed — no output" };
  }

  const draft = toolUse.input as GeneratedDraft;

  // Auto-save as ai_generated draft
  await upsertFullEnrichment(pool, {
    product_id: productId,
    backstory: draft.backstory || null,
    materials: draft.materials || null,
    fit_notes: draft.fit_notes || null,
    care_instructions: draft.care_instructions || null,
    sustainability_notes: draft.sustainability_notes || null,
    reasons_to_buy: draft.reasons_to_buy ?? [],
    staff_quote: draft.staff_quote || null,
    staff_name: null,
    staff_photo_url: null,
    video_url: draft.video_url || null,
    extra_images: [],
    reviews: [],
    awards: [],
    faq: draft.faq ?? [],
    internal_staff_notes: null,
    great_when: (draft.great_when ?? []).slice(0, MAX_GREAT_WHEN),
    ai_generated: true,
  });

  // Only a run that actually researched replaces the fact sheet; the owner's
  // edited and added facts are always kept.
  if (sources.length > 0) {
    await replaceResearchedFacts(pool, store.id, productId, factsFromModel(draft.facts ?? [], sources));
    await saveReviewFlags(pool, store.id, productId, "mismatch", draft.mismatches ?? []);   // D50
  }
  await checkProductNotes(pool, store.id, productId);   // D49

  revalidatePath(`/enrichment/${productId}`);
  return { draft: { ...draft, great_when: (draft.great_when ?? []).slice(0, MAX_GREAT_WHEN) } };
}
