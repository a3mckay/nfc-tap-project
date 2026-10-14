"use server";

import {
  getPool, upsertFullEnrichment, getProductById, updateManualProduct, getBrandWebsite, setBrandWebsite,
  replaceResearchedFacts, saveReviewFlags, getSpecSetup, saveResearchedSpecs, specCategoryFor, specFieldsFor, copyFor,
  type Review, type FaqItem,
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
  findBrandDomain, researchProduct, sourcesForPrompt, factsFromModel, specsFromModel, fetchPageText, videoFor,
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

// Cannabis Act promotion rules (s.17). Founder decisions, 2026-10-07, pending
// legal review (ACTION_ITEMS.md): facts only, and no staff quote (a testimonial).
const CANNABIS_RULES = `This is a cannabis product. Canada's Cannabis Act limits how it may be promoted, so every field must be factual: strain type, lineage, grower and how it was grown and cured, aroma and flavour, terpenes, THC and CBD as labelled, format and size. Never describe effects or how it may make someone feel (e.g. relaxing, energetic, uplifting, "daytime high", "couch-lock"), never suggest occasions, activities or a lifestyle, and make no health claims. Leave staff_quote empty.`;

// Canadian alcohol marketing rules (founder 2026-10-07, pending legal review).
const ALCOHOL_RULES = `This is an alcoholic drink. Canadian alcohol advertising rules apply: describe taste, food pairings, serving and gifting. Never suggest it changes mood or relieves stress, brings social, sexual or professional success, or encourages drinking more, and never link it to driving, sports or other activities that need care.`;
const ALCOHOL_GREAT_WHEN_HINT = "Exactly 3 short phrases that complete the sentence 'Great when…', naming a taste, food or moment it suits (e.g. 'you're cooking a slow braise', 'you want a red with depth under $30'). Max 10 words each. Don't repeat 'Great when'. No moods, effects, success or drinking more.";
const isAlcohol = (category: string) => category === "wine" || category === "beer" || category === "spirits";

// Canadian cosmetic rules (docs/category-beauty.md, founder-approved 2026-10-13).
const BEAUTY_RULES = `This is a cosmetic. In Canada a product that claims to treat or change the body is a drug, not a cosmetic, so describe appearance and feel only (e.g. "skin looks smoother", "reduces the look of fine lines", "feels hydrated"). Never claim it heals, treats acne, repairs the skin barrier, boosts collagen, is anti-inflammatory or reverses ageing. Say hypoallergenic, non-comedogenic, dermatologist tested, clinically proven, safe for sensitive skin, vegan or cruelty-free only when a source states it. Give SPF only as stated on the product, and ingredients only as the brand lists them.`;

// Toys (docs/category-toys-vintage.md, founder-approved 2026-10-13).
const TOY_RULES = `This is a toy. Write to the adult buyer, never to the child. Give the age range and any safety information only as the packaging or sources state them, and never invent a certification or a safety claim. Make no developmental or health claims (e.g. "boosts brain development", "makes kids smarter").`;

// Vintage: one-of-a-kind pieces, written from the owner's notes.
const VINTAGE_RULES = `This is a one-of-a-kind vintage or antique piece. Write from the store's description; any research is about the maker, not this exact piece. Never invent an era, maker, provenance or condition, and never state its value or investment potential. "One of a kind" is a fact: no urgency ("won't last", "grab it before it's gone").`;

// The extra rules each regulated or special category gets.
const CATEGORY_RULES: Partial<Record<string, string>> = {
  cannabis: CANNABIS_RULES, wine: ALCOHOL_RULES, beer: ALCOHOL_RULES, spirits: ALCOHOL_RULES,
  beauty: BEAUTY_RULES, toys: TOY_RULES, vintage: VINTAGE_RULES,
};

const GREAT_WHEN_HINT = "Exactly 3 short phrases that complete the sentence 'Great when…', naming the situation or problem this product is for (e.g. 'you need one boot from office to bar'). Max 10 words each. Don't repeat 'Great when'. No upselling.";
const CANNABIS_GREAT_WHEN_HINT = "Exactly 3 short factual phrases that complete the sentence 'Great when…', naming a quality a customer may be looking for (e.g. 'you want a limonene-forward sativa-dominant hybrid', 'you prefer hand-trimmed, cold-cured flower'). Max 10 words each. Don't repeat 'Great when'. No effects, moods, occasions or activities.";

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
  specs?: Array<{ key: string; value: string; source: number }>;
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

  // The spec fields for this product's category (Step 15l, D51).
  const setup = await getSpecSetup(pool, store.id, productId);
  const category = setup ? specCategoryFor(setup) : "general";
  const specFields = setup ? specFieldsFor(category) : [];
  const cannabis = category === "cannabis";
  const alcohol = isAlcohol(category);
  const copy = copyFor(category);   // the category's words for each field (docs/category-labels.md)
  const fieldHint = (key: keyof typeof copy.fields) => `${copy.fields[key].label}: ${copy.fields[key].instruction}`;

  // Research the product, brand's own site first (PRD v4 §7 Step 15b). Every
  // source is numbered so the facts the model returns can cite one.
  let webContext = "";
  let video: { url: string; title: string } | null = null;
  // No videos for cannabis: video is where lifestyle content creeps in (Cannabis Act).
  const wantsVideo = category !== "cannabis";
  let sources: ResearchSource[] = [];
  // A vintage piece with no maker has nothing to search for (founder, 2026-10-13).
  const nothingToResearch = category === "vintage" && !product.vendor;
  if (process.env.BRAVE_SEARCH_API_KEY && !nothingToResearch) {
    const deps: ResearchDeps = { search: braveSearch, fetchText: fetchPageText };
    try {
      const known = product.vendor ? await getBrandWebsite(pool, store.id, product.vendor) : null;
      const brand = product.vendor ? await findBrandDomain(product.vendor, known?.website ?? null, category, deps) : null;
      if (brand?.found && product.vendor) {
        await setBrandWebsite(pool, store.id, product.vendor, `https://${brand.domain}`, false);
      }
      const query = [product.vendor, product.title].filter(Boolean).join(" ");
      const [found, ytResults] = await Promise.all([
        researchProduct(product, brand?.domain ?? null, category, deps),
        wantsVideo ? braveSearch(`${query} site:youtube.com`, 3) : Promise.resolve([]),
      ]);
      sources = found;
      if (sources.length > 0) {
        webContext = "\n\nNumbered sources about this product. Brand sources are the most trusted; ground your copy in them and don't invent facts:\n" +
          sourcesForPrompt(sources);
      }
      video = videoFor(ytResults, product.vendor);
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
          materials: { type: "string", description: fieldHint("materials") },
          fit_notes: { type: "string", description: fieldHint("fit_notes") },
          care_instructions: { type: "string", description: fieldHint("care_instructions") },
          sustainability_notes: { type: "string", description: fieldHint("sustainability_notes") },
          reasons_to_buy: { type: "array", items: { type: "string" }, description: "3-4 bullet points, max 7 words each. Each must be a specific, different reason." },
          staff_quote: { type: "string", description: "One punchy first-person sentence a real staff member might say. No clichés." },
          video_url: { type: "string", description: video
            ? `A YouTube video found for this product, titled "${video.title}": ${video.url}. Use this URL only if the title shows it's about this product or brand; otherwise leave empty string.`
            : "No video was found: leave empty string." },
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
            description: cannabis ? CANNABIS_GREAT_WHEN_HINT : alcohol ? ALCOHOL_GREAT_WHEN_HINT : GREAT_WHEN_HINT,
          },
          facts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string", enum: [...copy.facts.topics] },
                fact: { type: "string", description: "One specific, checkable fact about this exact product, in a short sentence." },
                source: { type: "integer", description: "The number of the source this fact comes from." },
              },
              required: ["topic", "fact", "source"],
            },
            description: "Up to 12 facts about this product that are stated in the numbered sources, each citing its source number. Prefer brand sources. Leave out anything no source states. Empty array if there are no sources.",
          },
          specs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string", enum: specFields.length ? specFields.map((f) => f.key) : ["none"] },
                value: { type: "string", description: "Short value as the source states it, e.g. '22%' or 'Veneto, Italy'." },
                source: { type: "integer", description: "The number of the source it comes from." },
              },
              required: ["key", "value", "source"],
            },
            description: `Values for these spec fields, only where a numbered source states them: ${specFields.map((f) => `${f.key} (${f.label}: ${f.hint})`).join("; ") || "none"}. Leave out any field no source states. Empty array if there are no sources.`,
          },
          mismatches: {
            type: "array",
            items: { type: "string" },
            description: "Findings in the sources that don't fit this product's title or type (e.g. a source describes a sleeveless top but this is a shirt, or a different colourway or model), which you left out of the copy and facts. One short sentence each. Empty array if none.",
          },
        },
        required: ["backstory", "materials", "fit_notes", "care_instructions", "sustainability_notes", "reasons_to_buy", "staff_quote", "video_url", "faq", "great_when", "facts", "mismatches", "specs"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_product_copy" },
    messages: [{
      role: "user",
      content: `Generate SHORT, punchy in-store NFC tap page copy for this retail product:\n\n${productContext}${webContext}\n\nIMPORTANT: Keep every field brief — customers are on their phone in a store. Ground copy in the web research where provided; don't invent facts.${CATEGORY_RULES[category] ? `\n\n${CATEGORY_RULES[category]}` : ""}`,
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
  if (cannabis) draft.staff_quote = "";
  // Only the video that was offered: never a link the model made up.
  if (draft.video_url !== video?.url) draft.video_url = "";

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
    await replaceResearchedFacts(pool, store.id, productId, factsFromModel(draft.facts ?? [], sources, copy.facts.topics));
    await saveReviewFlags(pool, store.id, productId, "mismatch", draft.mismatches ?? []);   // D50
    await saveResearchedSpecs(pool, store.id, productId, specsFromModel(draft.specs ?? [], sources, specFields.map((f) => f.key)));   // D51
  }
  await checkProductNotes(pool, store.id, productId);   // D49

  revalidatePath(`/enrichment/${productId}`);
  return { draft: { ...draft, great_when: (draft.great_when ?? []).slice(0, MAX_GREAT_WHEN) } };
}
