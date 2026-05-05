import type { Pool } from "pg";

export type OfferTrigger = "always" | "after_reaction" | "after_n_taps";

export interface StoreOffer {
  id: string;
  store_id: string;
  product_id: string | null;
  code: string;
  message: string;
  trigger_kind: OfferTrigger;
  trigger_n: number | null;
  enabled: boolean;
  expires_at: Date | null;
  created_at: Date;
}

export interface StoreOfferInput {
  store_id: string;
  product_id: string | null;
  code: string;
  message: string;
  trigger_kind: OfferTrigger;
  trigger_n: number | null;
  enabled: boolean;
  expires_at: Date | null;
}

export async function createStoreOffer(pool: Pool, input: StoreOfferInput): Promise<StoreOffer> {
  const { rows } = await pool.query<StoreOffer>(
    `insert into store_offers
       (store_id, product_id, code, message, trigger_kind, trigger_n, enabled, expires_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning *`,
    [input.store_id, input.product_id, input.code, input.message, input.trigger_kind, input.trigger_n, input.enabled, input.expires_at],
  );
  if (!rows[0]) throw new Error("createStoreOffer returned no row");
  return rows[0];
}

export async function updateStoreOffer(pool: Pool, id: string, input: StoreOfferInput): Promise<void> {
  await pool.query(
    `update store_offers set
       product_id   = $2,
       code         = $3,
       message      = $4,
       trigger_kind = $5,
       trigger_n    = $6,
       enabled      = $7,
       expires_at   = $8
     where id = $1`,
    [id, input.product_id, input.code, input.message, input.trigger_kind, input.trigger_n, input.enabled, input.expires_at],
  );
}

export async function deleteStoreOffer(pool: Pool, id: string): Promise<void> {
  await pool.query(`delete from store_offers where id = $1`, [id]);
}

export async function getStoreOffersByStore(pool: Pool, storeId: string): Promise<StoreOffer[]> {
  const { rows } = await pool.query<StoreOffer>(
    `select * from store_offers where store_id = $1 order by created_at desc`,
    [storeId],
  );
  return rows;
}

// Returns the most relevant offer to surface for a given product+session+customer combo.
// Offer ordering: product-specific beats store-wide; if multiple are eligible, the newest wins.
export async function getApplicableOffer(
  pool: Pool,
  storeId: string,
  productId: string,
  sessionId: string,
  customerId: string | null,
): Promise<StoreOffer | null> {
  // We compute eligibility in SQL for speed.
  // - "always" is always eligible (subject to expiry/enabled)
  // - "after_reaction" is eligible if the session OR customer has any reaction on this product
  // - "after_n_taps" is eligible if the customer has tap_count totals >= n (across the store)
  //   For anonymous sessions, we count distinct tags from tap_events as a proxy.
  const { rows } = await pool.query<StoreOffer>(
    `with eligible as (
       select o.*
         from store_offers o
        where o.store_id = $1
          and o.enabled  = true
          and (o.expires_at is null or o.expires_at > now())
          and (o.product_id is null or o.product_id = $2)
          and (
            o.trigger_kind = 'always'
            or (
              o.trigger_kind = 'after_reaction'
              and exists (
                select 1 from tap_reactions r
                  join tags t on t.id = r.tag_id
                 where t.product_id = $2
                   and (r.session_id = $3 or ($4::uuid is not null and exists (
                     select 1 from customer_taps ct
                      where ct.customer_id = $4 and ct.tag_id = r.tag_id and ct.reaction is not null
                   )))
              )
            )
            or (
              o.trigger_kind = 'after_n_taps'
              and (
                ($4::uuid is not null and (
                  select count(*) from customer_taps ct
                   where ct.customer_id = $4 and ct.store_id = $1
                ) >= o.trigger_n)
                or (
                  $4::uuid is null and (
                    select count(distinct tag_id) from tap_events
                     where session_id = $3 and store_id = $1
                  ) >= o.trigger_n
                )
              )
            )
          )
     )
     select * from eligible
     order by (product_id is null), created_at desc
     limit 1`,
    [storeId, productId, sessionId, customerId],
  );
  return rows[0] ?? null;
}

// Records that an offer was delivered to a customer or session.
export async function recordOfferDelivery(
  pool: Pool,
  offer: StoreOffer,
  customerId: string | null,
  sessionId: string,
): Promise<void> {
  await pool.query(
    `insert into customer_offers
       (customer_id, session_id, store_id, product_id, code, message, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [customerId, customerId ? null : sessionId, offer.store_id, offer.product_id, offer.code, offer.message, offer.expires_at],
  );
}
