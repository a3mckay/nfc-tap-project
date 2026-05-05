import type { Pool } from "pg";

export interface Customer {
  id: string;
  email: string;
  email_verified_at: Date | null;
  created_at: Date;
}

export interface CustomerTapRow {
  id: string;
  tag_id: string;
  product_id: string | null;
  store_id: string;
  reaction: string | null;
  first_tapped_at: Date;
  last_tapped_at: Date;
  tap_count: number;
  // Joined for display
  product_title: string | null;
  product_vendor: string | null;
  product_image_url: string | null;
  store_domain: string;
}

export async function findOrCreateCustomerByEmail(
  pool: Pool,
  email: string,
): Promise<Customer> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query<Customer>(
    `insert into customers (email, email_verified_at)
     values ($1, now())
     on conflict (email)
     do update set email_verified_at = now()
     returning *`,
    [normalized],
  );
  if (!rows[0]) throw new Error("findOrCreateCustomerByEmail returned no row");
  return rows[0];
}

export async function getCustomerById(
  pool: Pool,
  id: string,
): Promise<Customer | null> {
  const { rows } = await pool.query<Customer>(
    `select * from customers where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// Record (or update) a tap for an identified customer.
// Tap_count increments and last_tapped_at updates if they tap the same tag again.
export async function upsertCustomerTap(
  pool: Pool,
  customerId: string,
  tagId: string,
  productId: string | null,
  storeId: string,
  reaction: string | null,
): Promise<void> {
  await pool.query(
    `insert into customer_taps
       (customer_id, tag_id, product_id, store_id, reaction)
     values ($1, $2, $3, $4, $5)
     on conflict (customer_id, tag_id)
     do update set
       last_tapped_at = now(),
       tap_count      = customer_taps.tap_count + 1,
       reaction       = coalesce(excluded.reaction, customer_taps.reaction),
       product_id     = coalesce(excluded.product_id, customer_taps.product_id)`,
    [customerId, tagId, productId, storeId, reaction],
  );
}

// Update only the reaction on an existing customer_tap row.
export async function updateCustomerTapReaction(
  pool: Pool,
  customerId: string,
  tagId: string,
  reaction: string,
): Promise<void> {
  await pool.query(
    `update customer_taps set reaction = $3, last_tapped_at = now()
      where customer_id = $1 and tag_id = $2`,
    [customerId, tagId, reaction],
  );
}

// Get the customer's full tap history with product + store info for display on /me.
export async function getCustomerTapHistory(
  pool: Pool,
  customerId: string,
  limit = 100,
): Promise<CustomerTapRow[]> {
  const { rows } = await pool.query<CustomerTapRow>(
    `select
       ct.id, ct.tag_id, ct.product_id, ct.store_id, ct.reaction,
       ct.first_tapped_at, ct.last_tapped_at, ct.tap_count,
       p.title  as product_title,
       p.vendor as product_vendor,
       (p.images->0->>'url') as product_image_url,
       s.shopify_shop_domain as store_domain
     from customer_taps ct
     left join products p on p.id = ct.product_id
     join stores s on s.id = ct.store_id
     where ct.customer_id = $1
     order by ct.last_tapped_at desc
     limit $2`,
    [customerId, limit],
  );
  return rows;
}

// Migrate anonymous tap_events into customer_taps when a customer verifies their email.
// Walks all the session's tap_events and upserts them as customer_taps.
export async function attachSessionTapsToCustomer(
  pool: Pool,
  customerId: string,
  sessionId: string,
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `with session_taps as (
       select distinct on (te.tag_id)
         te.tag_id, te.product_id, te.store_id, te.timestamp,
         (select reaction from tap_reactions
           where tag_id = te.tag_id and session_id = te.session_id
           limit 1) as reaction
       from tap_events te
       where te.session_id = $2
       order by te.tag_id, te.timestamp desc
     ),
     inserted as (
       insert into customer_taps
         (customer_id, tag_id, product_id, store_id, reaction, first_tapped_at, last_tapped_at)
       select $1, st.tag_id, st.product_id, st.store_id, st.reaction, st.timestamp, st.timestamp
         from session_taps st
       on conflict (customer_id, tag_id)
       do update set
         last_tapped_at = greatest(customer_taps.last_tapped_at, excluded.last_tapped_at),
         reaction       = coalesce(excluded.reaction, customer_taps.reaction)
       returning 1
     )
     select count(*)::text as count from inserted`,
    [customerId, sessionId],
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}
