-- §16 Notification system
-- Extends customers with contact info, adds global preferences (3×3 matrix),
-- per-product subscriptions (anonymous + authenticated), and a send log.

-- ── Extend customers ─────────────────────────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS phone             text,
  ADD COLUMN IF NOT EXISTS preferred_channel text NOT NULL DEFAULT 'email'
    CHECK (preferred_channel IN ('sms', 'whatsapp', 'email')),
  ADD COLUMN IF NOT EXISTS display_name      text;

-- ── Global notification preferences (one row per customer) ───────────────────
-- Each column answers: "send me [event] notifications for products I [level]ed"
-- Defaults reflect sensible starting state: loved gets everything, liked gets
-- sale+offer, tapped gets nothing (avoids spam for casual browsers).
CREATE TABLE notification_preferences (
  customer_id         uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  sale_for_loved      boolean NOT NULL DEFAULT true,
  sale_for_liked      boolean NOT NULL DEFAULT false,
  sale_for_tapped     boolean NOT NULL DEFAULT false,
  offer_for_loved     boolean NOT NULL DEFAULT true,
  offer_for_liked     boolean NOT NULL DEFAULT true,
  offer_for_tapped    boolean NOT NULL DEFAULT false,
  restock_for_loved   boolean NOT NULL DEFAULT true,
  restock_for_liked   boolean NOT NULL DEFAULT false,
  restock_for_tapped  boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Per-product opt-ins (tap page CTA, may be anonymous) ────────────────────
CREATE TABLE notification_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id)    ON DELETE CASCADE,
  product_id      uuid             REFERENCES products(id) ON DELETE SET NULL,
  customer_id     uuid             REFERENCES customers(id) ON DELETE CASCADE,
  session_id      text,
  contact_email   text,
  contact_phone   text,
  channel         text NOT NULL DEFAULT 'email'
    CHECK (channel IN ('sms', 'whatsapp', 'email')),
  event_types     text[] NOT NULL DEFAULT '{sale,restock,offer}',
  subscribed_at   timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  CHECK (customer_id IS NOT NULL OR session_id IS NOT NULL)
);
CREATE INDEX notif_subs_product_idx  ON notification_subscriptions(product_id);
CREATE INDEX notif_subs_customer_idx ON notification_subscriptions(customer_id);
CREATE INDEX notif_subs_store_idx    ON notification_subscriptions(store_id);

-- ── Sent notification log ────────────────────────────────────────────────────
CREATE TABLE notification_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id)  ON DELETE SET NULL,
  store_id    uuid NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id)  ON DELETE SET NULL,
  event_type  text NOT NULL CHECK (event_type IN ('sale', 'offer', 'restock', 'manual')),
  channel     text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  recipient   text NOT NULL,
  message     text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  twilio_sid  text,
  status      text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'failed'))
);
CREATE INDEX notif_log_customer_idx ON notification_log(customer_id);
CREATE INDEX notif_log_store_idx    ON notification_log(store_id);
CREATE INDEX notif_log_product_idx  ON notification_log(product_id);

-- Down:
-- ALTER TABLE customers DROP COLUMN IF EXISTS phone, DROP COLUMN IF EXISTS preferred_channel, DROP COLUMN IF EXISTS display_name;
-- DROP TABLE IF EXISTS notification_log;
-- DROP TABLE IF EXISTS notification_subscriptions;
-- DROP TABLE IF EXISTS notification_preferences;
