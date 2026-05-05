"use server";

import { getPool, getStoreByDomain, getProductById } from "@nfc/db";
import { revalidatePath } from "next/cache";
import { runPublicReviewsForProduct } from "../../../lib/public-reviews/run.js";

export interface RunPublicSearchResult {
  items_found: number;
  items_stored: number;
  error?: string;
}

export async function runPublicSearchForProductAction(
  shop: string,
  productId: string,
): Promise<RunPublicSearchResult> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { items_found: 0, items_stored: 0, error: "Store not found" };

  const product = await getProductById(pool, productId);
  if (!product) return { items_found: 0, items_stored: 0, error: "Product not found" };

  const result = await runPublicReviewsForProduct(
    pool, store.id, product.id, product.title, product.vendor,
  );

  revalidatePath("/reviews/pending");
  return {
    items_found: result.items_extracted,
    items_stored: result.items_stored,
    ...(result.error ? { error: result.error } : {}),
  };
}

export async function setPublicReviewsEnabledAction(
  shop: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };

  await pool.query(
    `update stores set public_reviews_enabled = $2 where id = $1`,
    [store.id, enabled],
  );
  revalidatePath("/reviews");
  revalidatePath("/settings");
  return {};
}
