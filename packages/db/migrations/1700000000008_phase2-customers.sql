-- §2 Customer identity foundation
-- Lightweight: email-only auth via magic link. No passwords.

CREATE TABLE customers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text NOT NULL UNIQUE,
  email_verified_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Denormalized tap history per customer for fast /me queries.
-- One row per (customer, tag) — re-tapping the same tag updates rather than appends.
CREATE TABLE customer_taps (
  id            bigserial PRIMARY KEY,
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id        uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reaction      text CHECK (reaction IS NULL OR reaction IN ('loved','liked','passed')),
  first_tapped_at timestamptz NOT NULL DEFAULT now(),
  last_tapped_at  timestamptz NOT NULL DEFAULT now(),
  tap_count       integer NOT NULL DEFAULT 1,
  UNIQUE (customer_id, tag_id)
);
CREATE INDEX customer_taps_customer_idx ON customer_taps(customer_id, last_tapped_at DESC);
CREATE INDEX customer_taps_store_idx    ON customer_taps(store_id);

-- Offers delivered to a customer (or to an anonymous session) by a store.
CREATE TABLE customer_offers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid REFERENCES customers(id) ON DELETE CASCADE,
  session_id    text,
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  code          text NOT NULL,
  message       text,
  expires_at    timestamptz,
  delivered_at  timestamptz NOT NULL DEFAULT now(),
  seen_at       timestamptz,
  claimed_at    timestamptz,
  CHECK (customer_id IS NOT NULL OR session_id IS NOT NULL)
);
CREATE INDEX customer_offers_customer_idx ON customer_offers(customer_id);
CREATE INDEX customer_offers_session_idx  ON customer_offers(session_id);

-- Single-use magic link tokens. Short-lived (15 min).
CREATE TABLE auth_tokens (
  token       text PRIMARY KEY,
  email       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_email_idx ON auth_tokens(email);
