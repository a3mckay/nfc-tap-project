import type { Pool } from "pg";

export interface TapEventInput {
  tag_id: string;
  product_id: string | null;
  store_id: string;
  session_id: string;
  device_type: string | null;
}

export async function insertTapEvent(pool: Pool, event: TapEventInput): Promise<void> {
  await pool.query(
    `insert into tap_events (tag_id, product_id, store_id, session_id, device_type)
     values ($1, $2, $3, $4, $5)`,
    [event.tag_id, event.product_id, event.store_id, event.session_id, event.device_type],
  );
}

// Distinct-session tap count for a product over a window (default 30 days).
// Distinct sessions avoids inflating numbers from a single curious customer.
export async function getProductTapCount(
  pool: Pool,
  productId: string,
  windowDays = 30,
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `select count(distinct session_id)::text as count
       from tap_events
      where product_id = $1
        and timestamp > now() - ($2 || ' days')::interval`,
    [productId, windowDays],
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}
