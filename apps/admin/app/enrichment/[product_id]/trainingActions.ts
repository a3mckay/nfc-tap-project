"use server";

import Anthropic from "@anthropic-ai/sdk";
import {
  getPool, getProductById, getEnrichmentByProductId, getProductsWithStatus, saveProductTraining,
  getSpecSetup, specCategoryFor, copyFor,
} from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { normalizeTrainingForm, type TrainingFormData } from "@/training-utils.js";
import { draftTraining, type TrainingDraft } from "@/lib/training-draft.js";
import { revalidatePath } from "next/cache";
import { checkProductNotes } from "@/lib/check-product.js";

export async function saveTrainingAction(
  shop: string,
  productId: string,
  form: TrainingFormData,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "training");
  if (!store) return { error: "Store not found" };

  const saved = await saveProductTraining(pool, store.id, productId, normalizeTrainingForm(form));
  if (!saved) return { error: "Product not found" };
  await checkProductNotes(pool, store.id, productId);   // Step 15k (D49)
  revalidatePath(`/enrichment/${productId}/training`);
  return {};
}

// Returns a draft for the owner to review; nothing is saved.
export async function draftTrainingAction(
  shop: string,
  productId: string,
): Promise<{ draft?: TrainingDraft; error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "training");
  if (!store) return { error: "Store not found" };

  const product = await getProductById(pool, productId);
  if (!product || product.store_id !== store.id) return { error: "Product not found" };

  if (!process.env.ANTHROPIC_API_KEY) return { error: "AI drafting isn't set up (ANTHROPIC_API_KEY is missing)" };

  const [enrichment, products, specSetup] = await Promise.all([
    getEnrichmentByProductId(pool, productId),
    getProductsWithStatus(pool, store.id),
    getSpecSetup(pool, store.id, productId),
  ]);
  // The category's words (docs/category-labels.md), so a wine isn't drafted as a shoe.
  const copy = copyFor(specSetup ? specCategoryFor(specSetup) : "general");

  try {
    const draft = await draftTraining(new Anthropic(), {
      labels: {
        fit: copy.fields.fit_notes.label, materials: copy.fields.materials.label,
        truth: copy.training.truth.label, truthHint: copy.training.truth.hint,
      },
      title: product.title,
      vendor: product.vendor,
      productType: product.product_type,
      description: product.description_html
        ? product.description_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500)
        : null,
      existingCopy: enrichment && {
        fit_notes: enrichment.fit_notes,
        backstory: enrichment.backstory,
        materials: enrichment.materials,
        reasons_to_buy: enrichment.reasons_to_buy ?? [],
        faq: enrichment.faq ?? [],
      },
      otherProducts: products
        .filter((p) => p.id !== productId && !p.is_archived)
        .map((p) => p.title)
        .slice(0, 60),
    });
    return { draft };
  } catch (err) {
    return { error: `AI draft failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
