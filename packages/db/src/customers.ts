import type { Pool } from "pg";

export interface Customer {
  id: string;
  email: string;
  email_verified_at: Date | null;
  created_at: Date;
  phone: string | null;
  preferred_channel: "sms" | "whatsapp" | "email";
  display_name: string | null;
}

export interface CustomerTapRow {
  id: string;
  tag_id: string;
  tag_uuid: string;
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
       t.tag_uuid,
       p.title  as product_title,
       p.vendor as product_vendor,
       coalesce(
         p.images->0->>'url',
         p.images->0->>'src',
         e.extra_images->>0
       ) as product_image_url,
       s.shopify_shop_domain as store_domain
     from customer_taps ct
     join tags t on t.id = ct.tag_id
     left join products p on p.id = ct.product_id
     left join enrichments e on e.product_id = ct.product_id
     join stores s on s.id = ct.store_id
     where ct.customer_id = $1
     order by ct.last_tapped_at desc
     limit $2`,
    [customerId, limit],
  );
  return rows;
}

// Update a customer's profile (display name, phone, preferred channel).
export async function updateCustomerProfile(
  pool: Pool,
  customerId: string,
  opts: {
    displayName?: string | null;
    phone?: string | null;
    preferredChannel?: "sms" | "whatsapp" | "email";
  },
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [customerId];

  if ("displayName" in opts) {
    values.push(opts.displayName ?? null);
    fields.push(`display_name = $${values.length}`);
  }
  if ("phone" in opts) {
    values.push(opts.phone ?? null);
    fields.push(`phone = $${values.length}`);
  }
  if ("preferredChannel" in opts) {
    values.push(opts.preferredChannel);
    fields.push(`preferred_channel = $${values.length}`);
  }
  if (fields.length === 0) return;

  await pool.query(
    `update customers set ${fields.join(", ")} where id = $1`,
    values,
  );
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

// ── Active offers for a customer ─────────────────────────────────────────────

export interface CustomerOfferRow {
  id: string;
  store_id: string;
  product_id: string | null;
  code: string;
  message: string;
  expires_at: Date | null;
  created_at: Date;
  store_domain: string;
  store_name: string | null;
  product_title: string | null;
  product_image_url: string | null;
}

export async function getCustomerActiveOffers(
  pool: Pool,
  customerId: string,
): Promise<CustomerOfferRow[]> {
  const { rows } = await pool.query<CustomerOfferRow>(
    `select co.id, co.store_id, co.product_id, co.code, co.message,
            co.expires_at, co.created_at,
            s.shopify_shop_domain as store_domain,
            null::text as store_name,
            p.title as product_title,
            coalesce(p.images->0->>'url', p.images->0->>'src', e.extra_images->>0) as product_image_url
     from customer_offers co
     join stores s on s.id = co.store_id
     left join products p on p.id = co.product_id
     left join enrichments e on e.product_id = co.product_id
     where co.customer_id = $1
       and (co.expires_at is null or co.expires_at > now())
     order by co.expires_at asc nulls last, co.created_at desc`,
    [customerId],
  );
  return rows;
}

// ── New products from stores the customer has already visited ─────────────────

export interface NewProductRow {
  id: string;
  title: string;
  vendor: string | null;
  product_image_url: string | null;
  store_domain: string;
  store_name: string | null;
  tag_uuid: string | null;
}

export async function getNewProductsFromVisitedStores(
  pool: Pool,
  customerId: string,
  limit = 12,
): Promise<NewProductRow[]> {
  const { rows } = await pool.query<NewProductRow>(
    `select p.id, p.title, p.vendor,
            coalesce(p.images->0->>'url', p.images->0->>'src', e.extra_images->>0) as product_image_url,
            s.shopify_shop_domain as store_domain,
            null::text as store_name,
            (select t.tag_uuid from tags t
              where t.product_id = p.id and t.status = 'deployed'
              limit 1) as tag_uuid
     from products p
     join stores s on s.id = p.store_id
     left join enrichments e on e.product_id = p.id
     where s.id in (
       select distinct ct.store_id from customer_taps ct where ct.customer_id = $1
     )
       and p.id not in (
         select distinct ct.product_id from customer_taps ct
          where ct.customer_id = $1 and ct.product_id is not null
       )
       and p.status = 'active'
       and p.deleted_at is null
     order by p.created_at desc
     limit $2`,
    [customerId, limit],
  );
  return rows;
}
