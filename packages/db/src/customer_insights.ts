import type { Pool } from "pg";

// Unity / Collector queries — derived from customer_taps history.
// All queries are guarded by minimum thresholds so we never surface noise.
// Returns null when there's no clear pattern.

export interface BrandCollectorInsight {
  vendor: string;
  count: number;
}

export interface CategoryPatternInsight {
  product_type: string;
  count: number;
}

export interface SimilarProductSuggestion {
  product_id: string;
  tag_uuid: string;
  title: string;
  vendor: string | null;
  image_url: string | null;
}

// "You've tapped X products from this brand" — used to suggest browsing the brand's full collection.
export async function getBrandCollectorForCustomer(
  pool: Pool,
  customerId: string,
  vendor: string,
  minTaps = 2,
): Promise<BrandCollectorInsight | null> {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*)::text as count
       from customer_taps ct
       join products p on p.id = ct.product_id
      where ct.customer_id = $1
        and lower(p.vendor) = lower($2)`,
    [customerId, vendor],
  );
  const count = parseInt(rows[0]?.count ?? "0", 10);
  return count >= minTaps ? { vendor, count } : null;
}

// "You keep coming back to X" — pattern across product_type.
export async function getCategoryPatternForCustomer(
  pool: Pool,
  customerId: string,
  productType: string,
  minTaps = 3,
): Promise<CategoryPatternInsight | null> {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*)::text as count
       from customer_taps ct
       join products p on p.id = ct.product_id
      where ct.customer_id = $1
        and lower(p.product_type) = lower($2)`,
    [customerId, productType],
  );
  const count = parseInt(rows[0]?.count ?? "0", 10);
  return count >= minTaps ? { product_type: productType, count } : null;
}

// "Other products from this brand the customer hasn't tapped yet" — for cross-discovery
// within the same store. Limited to a few suggestions.
export async function getUntappedSameBrandProducts(
  pool: Pool,
  customerId: string,
  storeId: string,
  vendor: string,
  excludeProductId: string,
  limit = 4,
): Promise<SimilarProductSuggestion[]> {
  const { rows } = await pool.query<SimilarProductSuggestion>(
    `select
       p.id as product_id,
       (select tag_uuid::text from tags t where t.product_id = p.id and t.status = 'active' limit 1) as tag_uuid,
       p.title, p.vendor,
       (p.images->0->>'url') as image_url
       from products p
      where p.store_id = $1
        and lower(p.vendor) = lower($2)
        and p.id <> $3
        and p.deleted_at is null
        and p.status = 'active'
        and not exists (
          select 1 from customer_taps ct
           where ct.customer_id = $4 and ct.product_id = p.id
        )
      order by p.title
      limit $5`,
    [storeId, vendor, excludeProductId, customerId, limit],
  );
  // Drop products without a live tag — we'd have nowhere to link them.
  return rows.filter((r) => r.tag_uuid !== null);
}
