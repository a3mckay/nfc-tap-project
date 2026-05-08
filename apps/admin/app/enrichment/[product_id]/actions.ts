"use server";

import { getPool, upsertFullEnrichment, getStoreByDomain, getProductById, type Review, type FaqItem } from "@nfc/db";
import { revalidatePath } from "next/cache";
import {
  parseReasonsInput,
  parseExtraImagesInput,
} from "../../../src/enrichment-utils.js";
import Anthropic from "@anthropic-ai/sdk";

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

interface GeneratedDraft {
  backstory: string;
  materials: string;
  fit_notes: string;
  care_instructions: string;
  sustainability_notes: string;
  reasons_to_buy: string[];
  staff_quote: string;
  faq: FaqItem[];
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

  let result;
  try {
    result = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    tools: [{
      name: "submit_product_copy",
      description: "Submit the generated product copy for a retail product NFC tap page. Write as if speaking directly to a curious customer who just tapped an NFC tag on this product in-store. Tone should match the brand — premium but approachable.",
      input_schema: {
        type: "object" as const,
        properties: {
          backstory: { type: "string", description: "2-3 sentences on brand origin, craft, or product design story. Authentic and specific." },
          materials: { type: "string", description: "Key materials, fabric weight, or construction details. Specific and tactile." },
          fit_notes: { type: "string", description: "How it fits, sizing guidance, or how to wear/use it. Skip if not applicable." },
          care_instructions: { type: "string", description: "Care method in plain language (e.g. 'Machine wash cold, lay flat to dry')." },
          sustainability_notes: { type: "string", description: "Any sustainability, ethics, or certification angle. Leave empty string if none known." },
          reasons_to_buy: { type: "array", items: { type: "string" }, description: "3-5 punchy bullet points (under 10 words each) — the best reasons to buy this product." },
          staff_quote: { type: "string", description: "A short, authentic staff member quote about why they love this product. 1-2 sentences, first person." },
          faq: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" },
              },
              required: ["question", "answer"],
            },
            description: "2-3 frequently asked questions a customer might have when seeing this product in-store.",
          },
        },
        required: ["backstory", "materials", "fit_notes", "care_instructions", "sustainability_notes", "reasons_to_buy", "staff_quote", "faq"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_product_copy" },
    messages: [{
      role: "user",
      content: `Generate compelling in-store NFC tap page copy for this retail product:\n\n${productContext}\n\nWrite copy that would delight a customer who just tapped the NFC tag on this product. Be specific and authentic — avoid generic marketing language.`,
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
    video_url: null,
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
