import type { Pool } from "pg";

export type PriceTier = "budget" | "mid" | "premium" | "luxury";

export function derivePriceTier(price: number | null): PriceTier | null {
  if (price === null) return null;
  if (price < 50) return "budget";
  if (price < 200) return "mid";
  if (price < 500) return "premium";
  return "luxury";
}

function extractMinPrice(variants: unknown): number | null {
  if (!Array.isArray(variants)) return null;
  const prices: number[] = [];
  for (const v of variants) {
    const p = parseFloat((v as Record<string, unknown>)["price"] as string);
    if (Number.isFinite(p)) prices.push(p);
  }
  return prices.length > 0 ? Math.min(...prices) : null;
}

export async function runEventEnrichmentJob(
  pool: Pool,
  storeId: string,
): Promise<void> {
  const { rows: events } = await pool.query<{
    event_id: string;
    product_id: string;
    canonical_product_id: string | null;
    brand_id: string | null;
    variants: unknown;
  }>(
    `select te.id as event_id, te.product_id,
            m.canonical_product_id,
            cp.brand_id,
            p.variants
       from tap_events te
       join products p on p.id = te.product_id
       left join product_canonical_map m on m.store_product_id = te.product_id
       left join canonical_products cp on cp.id = m.canonical_product_id
      where te.store_id = $1
        and te.enriched_at is null
        and te.product_id is not null
      limit 1000`,
    [storeId],
  );

  if (events.length === 0) return;

  console.log(`[enrich] ${events.length} event(s) to enrich for store ${storeId}`);

  for (const event of events) {
    const minPrice = extractMinPrice(event.variants);
    const priceTier = derivePriceTier(minPrice);

    await pool.query(
      `update tap_events
          set canonical_product_id = $2,
              brand_id              = $3,
              price_tier            = $4,
              enriched_at           = now()
        where id = $1`,
      [event.event_id, event.canonical_product_id, event.brand_id, priceTier],
    );
  }

  console.log(`[enrich] done for store ${storeId}`);
}
