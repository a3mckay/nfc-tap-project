"use server";

import { getPool, getStoreByDomain, upsertReviewSource, type ReviewProvider } from "@nfc/db";
import { revalidatePath } from "next/cache";
import { detectInstalledReviewApp } from "../../lib/reviews/detect.js";
import { syncReviewsForStore, type SyncReviewsResult } from "../../lib/reviews/sync.js";

export interface DetectResult {
  detected: Array<{ provider: ReviewProvider; app_title: string }>;
  error?: string;
}

export async function detectReviewAppsAction(shop: string): Promise<DetectResult> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { detected: [], error: "Store not found" };
  if (!store.shopify_access_token) return { detected: [], error: "No Shopify access token" };

  const detected = await detectInstalledReviewApp(shop, store.shopify_access_token);
  // Auto-create review_sources rows for everything detected.
  for (const d of detected) {
    await upsertReviewSource(pool, store.id, d.provider, {});
  }

  revalidatePath("/reviews");
  return { detected };
}

export async function configureReviewSourceAction(
  shop: string,
  provider: ReviewProvider,
  config: Record<string, unknown>,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };

  await upsertReviewSource(pool, store.id, provider, config);
  revalidatePath("/reviews");
  return {};
}

export async function syncReviewsAction(shop: string): Promise<SyncReviewsResult & { error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { provider_results: [], error: "Store not found" };

  const result = await syncReviewsForStore(pool, store.id, shop);
  revalidatePath("/reviews");
  return result;
}
