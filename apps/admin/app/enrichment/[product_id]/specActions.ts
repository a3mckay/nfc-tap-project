"use server";

// PRD v4 §7 Step 15l: the product's spec fields (D51). Owner and manager edits
// win over research; a category can be chosen instead of the detected one.
import { getPool, saveOwnerSpecs, setProductSpecCategory, getSpecSetup, specCategoryFor, SPEC_CATEGORIES, specFieldsFor, type SpecCategory } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";
import { checkProductNotes } from "@/lib/check-product.js";

export async function saveSpecsAction(
  shop: string,
  productId: string,
  category: string | null,
  values: Record<string, string>,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "content");
  if (!store) return { error: "Not allowed" };
  if (category !== null && !(SPEC_CATEGORIES as string[]).includes(category)) return { error: "Unknown category" };

  await setProductSpecCategory(pool, store.id, productId, category);
  // On "Automatic", the fields are the detected category's, worked out here.
  const setup = await getSpecSetup(pool, store.id, productId);
  if (!setup) return { error: "Product not found" };
  const keys = new Set(specFieldsFor(specCategoryFor({ ...setup, override: category as SpecCategory | null })).map((f) => f.key));
  await saveOwnerSpecs(pool, store.id, productId, Object.fromEntries(Object.entries(values).filter(([k]) => keys.has(k))));
  await checkProductNotes(pool, store.id, productId);
  revalidatePath(`/enrichment/${productId}`);
  return {};
}
