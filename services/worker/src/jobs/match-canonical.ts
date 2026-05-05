import type { Pool } from "pg";
import {
  getUnmatchedProducts,
  upsertBrand,
  upsertCanonicalProduct,
  upsertProductCanonicalMap,
} from "@nfc/db";

export function normalizeBrandSlug(vendor: string): string {
  return vendor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^[&\s]+/, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeProductName(title: string): string {
  return title
    .replace(/\(.*?\)/g, "")
    .replace(/\s+[-|].*$/, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export async function runCanonicalMatchJob(
  pool: Pool,
  storeId: string,
): Promise<void> {
  const products = await getUnmatchedProducts(pool, storeId);
  if (products.length === 0) return;

  console.log(`[canonical] ${products.length} product(s) to match for store ${storeId}`);

  for (const product of products) {
    try {
      const vendorName = product.vendor?.trim() || "Unknown";
      const brandSlug = normalizeBrandSlug(vendorName);
      const nameNormalized = normalizeProductName(product.title);

      const brand = await upsertBrand(pool, vendorName, brandSlug);
      const canonical = await upsertCanonicalProduct(
        pool,
        brand.id,
        nameNormalized,
        product.product_type,
      );

      // Confidence 1.0 — deterministic normalization, not fuzzy.
      // reviewed=false so new canonical entries get a human sanity check.
      await upsertProductCanonicalMap(
        pool,
        product.id,
        canonical.id,
        "auto-normalize",
        1.0,
        false,
      );

      console.log(`[canonical] matched: "${product.title}" → "${nameNormalized}" (${brandSlug})`);
    } catch (err) {
      console.error(`[canonical] failed: ${product.title}`, err);
    }
  }

  console.log(`[canonical] done for store ${storeId}`);
}
