"use server";

import { getPool, upsertFullEnrichment, getStoreByDomain, getProductById, type Review, type FaqItem } from "@nfc/db";
import { revalidatePath } from "next/cache";
import {
  parseReasonsInput,
  parseExtraImagesInput,
} from "../../../src/enrichment-utils.js";
import Anthropic from "@anthropic-ai/sdk";
import { braveSearch } from "../../../lib/public-reviews/search.js";

export interface EnrichmentFormData {
  shop: string;
  product_id: string;
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
}

export async function saveEnrichmentAction(
  data: EnrichmentFormData,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });

  const store = await getStoreByDomain(pool, data.shop);
  if (!store) return { error: "Store not found" };

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
  });

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
}

export async function generateEnrichmentAction(
  shop: string,
  productId: string,
): Promise<{ draft?: GeneratedDraft; error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
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

  // Optionally ground copy in real web sources via Brave Search
  let webContext = "";
  let youtubeUrl = "";
  if (process.env.BRAVE_SEARCH_API_KEY) {
    const query = [product.vendor, product.title].filter(Boolean).join(" ");
    try {
      // Run product research and YouTube searches in parallel
      const [results, ytResults] = await Promise.all([
        braveSearch(`${query} materials features review`, 6),
        braveSearch(`${query} site:youtube.com`, 3),
      ]);
      if (results.length > 0) {
        webContext = "\n\nWeb research about this product (use to ground your copy in facts):\n" +
          results.map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`).join("\n\n");
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
        },
        required: ["backstory", "materials", "fit_notes", "care_instructions", "sustainability_notes", "reasons_to_buy", "staff_quote", "video_url", "faq"],
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
    ai_generated: true,
  });

  revalidatePath(`/enrichment/${productId}`);
  return { draft };
}
