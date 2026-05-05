import {
  type Pool, getReviewSourcesByStore, setReviewSourceLastSynced,
  upsertExternalReview,
} from "@nfc/db";
import { getAdapter, type ProductRef } from "./index.js";

export interface SyncReviewsResult {
  provider_results: Array<{ provider: string; products_processed: number; reviews_added: number; error?: string }>;
}

// Syncs reviews from every enabled review source for a store across every product.
// Idempotent: re-running just upserts. Cheap to run on a 24h cron.
export async function syncReviewsForStore(
  pool: Pool,
  storeId: string,
  shopDomain: string,
): Promise<SyncReviewsResult> {
  const sources = await getReviewSourcesByStore(pool, storeId);
  const enabledRemote = sources.filter(
    (s) => s.enabled && s.provider !== "manual" && s.provider !== "public_search",
  );

  // Pull all products with their Shopify IDs so adapters can look them up.
  const { rows: products } = await pool.query<{
    id: string; shopify_product_id: string | null; title: string;
  }>(
    `select id, shopify_product_id, title from products
      where store_id = $1 and deleted_at is null and is_manual = false`,
    [storeId],
  );

  const result: SyncReviewsResult = { provider_results: [] };

  for (const source of enabledRemote) {
    const adapter = getAdapter(source.provider);
    if (!adapter) {
      result.provider_results.push({ provider: source.provider, products_processed: 0, reviews_added: 0, error: "no adapter" });
      continue;
    }

    let added = 0;
    let processed = 0;
    let firstError: string | undefined;

    for (const p of products) {
      const ref: ProductRef = {
        product_id: p.id,
        shopify_product_id: p.shopify_product_id,
        title: p.title,
      };
      try {
        const reviews = await adapter.fetchReviewsForProduct(source.config, shopDomain, ref);
        for (const r of reviews) {
          await upsertExternalReview(pool, {
            store_id: storeId,
            product_id: p.id,
            provider: adapter.provider,
            external_id: r.external_id,
            author: r.author,
            author_avatar_url: r.author_avatar_url,
            rating: r.rating,
            title: r.title,
            body: r.body,
            source_url: r.source_url,
            source_label: adapter.source_label,
            published_at: r.published_at,
            status: "approved",
          });
          added++;
        }
        processed++;
      } catch (err) {
        firstError ??= err instanceof Error ? err.message : String(err);
      }
    }

    await setReviewSourceLastSynced(pool, source.id);
    result.provider_results.push({
      provider: adapter.provider,
      products_processed: processed,
      reviews_added: added,
      ...(firstError ? { error: firstError } : {}),
    });
  }

  return result;
}
