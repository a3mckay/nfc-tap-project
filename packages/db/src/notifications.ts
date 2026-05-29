import type { Pool } from "pg";

export type NotificationEventType = "sale" | "offer" | "restock" | "manual";
export type NotificationChannel = "sms" | "whatsapp" | "email";

// ── Notification preferences ─────────────────────────────────────────────────

export interface NotificationPrefs {
  customer_id: string;
  sale_for_loved: boolean;
  sale_for_liked: boolean;
  sale_for_tapped: boolean;
  offer_for_loved: boolean;
  offer_for_liked: boolean;
  offer_for_tapped: boolean;
  restock_for_loved: boolean;
  restock_for_liked: boolean;
  restock_for_tapped: boolean;
}

/** Returns the customer's preferences, creating a default row if none exists. */
export async function getOrCreateNotificationPrefs(
  pool: Pool,
  customerId: string,
): Promise<NotificationPrefs> {
  const { rows } = await pool.query<NotificationPrefs>(
    `insert into notification_preferences (customer_id)
     values ($1)
     on conflict (customer_id) do update set updated_at = now()
     returning *`,
    [customerId],
  );
  if (!rows[0]) throw new Error("getOrCreateNotificationPrefs: no row returned");
  return rows[0];
}

export async function updateNotificationPrefs(
  pool: Pool,
  customerId: string,
  prefs: Partial<Omit<NotificationPrefs, "customer_id">>,
): Promise<void> {
  const fields = Object.keys(prefs) as Array<keyof typeof prefs>;
  if (fields.length === 0) return;
  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const values = fields.map((f) => prefs[f]);
  await pool.query(
    `update notification_preferences
     set ${setClauses}, updated_at = now()
     where customer_id = $1`,
    [customerId, ...values],
  );
}

// ── Per-product subscriptions ────────────────────────────────────────────────

export interface NotificationSubscription {
  id: string;
  store_id: string;
  product_id: string | null;
  customer_id: string | null;
  session_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  channel: NotificationChannel;
  event_types: string[];
  subscribed_at: Date;
  unsubscribed_at: Date | null;
}

export async function upsertNotificationSubscription(
  pool: Pool,
  opts: {
    storeId: string;
    productId: string | null;
    customerId: string | null;
    sessionId: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    channel: NotificationChannel;
    eventTypes?: NotificationEventType[];
  },
): Promise<void> {
  const eventTypes = opts.eventTypes ?? ["sale", "restock", "offer"];
  await pool.query(
    `insert into notification_subscriptions
       (store_id, product_id, customer_id, session_id, contact_email, contact_phone, channel, event_types)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict do nothing`,
    [
      opts.storeId,
      opts.productId,
      opts.customerId,
      opts.sessionId,
      opts.contactEmail,
      opts.contactPhone,
      opts.channel,
      eventTypes,
    ],
  );
}

// ── Recipients for a send ────────────────────────────────────────────────────

export interface NotifiableRecipient {
  customer_id: string | null;
  email: string | null;
  phone: string | null;
  preferred_channel: NotificationChannel;
  source: "preference" | "subscription";
}

/**
 * Returns all recipients who should receive a notification for a given
 * product + event type.
 *
 * Two sources:
 *   1. Registered customers: have tapped/liked/loved the product and have the
 *      matching preference flag enabled.
 *   2. Anonymous subscriptions: per-product opt-ins from the tap page.
 *
 * "manual" event type returns every customer who has ever tapped the product
 * (used for admin broadcast messages).
 */
export async function getProductNotifiableRecipients(
  pool: Pool,
  storeId: string,
  productId: string,
  eventType: NotificationEventType,
): Promise<NotifiableRecipient[]> {
  // Registered customers via preference matrix
  const { rows: prefRows } = await pool.query<NotifiableRecipient>(
    `select
       c.id            as customer_id,
       c.email,
       c.phone,
       c.preferred_channel,
       'preference'::text as source
     from customer_taps ct
     join customers c on c.id = ct.customer_id
     left join notification_preferences np on np.customer_id = c.id
     where ct.product_id = $1
       and ct.store_id   = $2
       and ct.reaction   != 'passed'
       and (
         $3 = 'manual'
         or (
           $3 = 'sale' and (
             (ct.reaction = 'loved' and coalesce(np.sale_for_loved,  true))  or
             (ct.reaction = 'liked' and coalesce(np.sale_for_liked,  false)) or
             (ct.reaction is null   and coalesce(np.sale_for_tapped, false))
           )
         )
         or (
           $3 = 'offer' and (
             (ct.reaction = 'loved' and coalesce(np.offer_for_loved,  true)) or
             (ct.reaction = 'liked' and coalesce(np.offer_for_liked,  true)) or
             (ct.reaction is null   and coalesce(np.offer_for_tapped, false))
           )
         )
         or (
           $3 = 'restock' and (
             (ct.reaction = 'loved' and coalesce(np.restock_for_loved,  true))  or
             (ct.reaction = 'liked' and coalesce(np.restock_for_liked,  false)) or
             (ct.reaction is null   and coalesce(np.restock_for_tapped, false))
           )
         )
       )
       and (c.email is not null or c.phone is not null)`,
    [productId, storeId, eventType],
  );

  // Anonymous subscriptions
  const { rows: subRows } = await pool.query<NotifiableRecipient>(
    `select
       customer_id,
       contact_email   as email,
       contact_phone   as phone,
       channel         as preferred_channel,
       'subscription'::text as source
     from notification_subscriptions
     where product_id       = $1
       and store_id         = $2
       and unsubscribed_at  is null
       and (
         $3 = 'manual'
         or event_types @> array[$3::text]
       )
       and (contact_email is not null or contact_phone is not null)`,
    [productId, storeId, eventType],
  );

  // Deduplicate by email (registered customers take precedence)
  const seen = new Set<string>();
  const results: NotifiableRecipient[] = [];
  for (const row of [...prefRows, ...subRows]) {
    const key = row.customer_id ?? row.email ?? row.phone ?? "";
    if (key && !seen.has(key)) {
      seen.add(key);
      results.push(row);
    }
  }
  return results;
}

// ── Notification log ─────────────────────────────────────────────────────────

export async function logNotification(
  pool: Pool,
  opts: {
    customerId: string | null;
    storeId: string;
    productId: string | null;
    eventType: NotificationEventType;
    channel: NotificationChannel;
    recipient: string;
    message: string;
    twilioSid?: string | null;
    status?: "sent" | "delivered" | "failed";
  },
): Promise<void> {
  await pool.query(
    `insert into notification_log
       (customer_id, store_id, product_id, event_type, channel, recipient, message, twilio_sid, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      opts.customerId,
      opts.storeId,
      opts.productId,
      opts.eventType,
      opts.channel,
      opts.recipient,
      opts.message,
      opts.twilioSid ?? null,
      opts.status ?? "sent",
    ],
  );
}

// ── Notification log history (for admin UI) ──────────────────────────────────

export interface NotificationLogRow {
  id: string;
  event_type: string;
  channel: string;
  recipient: string;
  message: string;
  sent_at: Date;
  status: string;
  product_title: string | null;
}

export async function getNotificationLogByStore(
  pool: Pool,
  storeId: string,
  limit = 50,
): Promise<NotificationLogRow[]> {
  const { rows } = await pool.query<NotificationLogRow>(
    `select nl.id, nl.event_type, nl.channel, nl.recipient,
            nl.message, nl.sent_at, nl.status,
            p.title as product_title
     from notification_log nl
     left join products p on p.id = nl.product_id
     where nl.store_id = $1
     order by nl.sent_at desc
     limit $2`,
    [storeId, limit],
  );
  return rows;
}
