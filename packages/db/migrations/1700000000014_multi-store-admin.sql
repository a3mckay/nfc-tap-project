-- §14 Multi-store admin: display name + per-store admin accounts

-- Add a human-readable display name to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS name text;

-- Backfill: use shopify_shop_domain as the display name for existing stores
UPDATE stores SET name = shopify_shop_domain WHERE name IS NULL;

-- Per-store admin accounts (email + PBKDF2 password hash, edge-safe)
CREATE TABLE store_admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,   -- format: base64url(salt):base64url(PBKDF2-SHA256)
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX store_admins_store_idx ON store_admins(store_id);
CREATE INDEX store_admins_email_idx ON store_admins(email);
