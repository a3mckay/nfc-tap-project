-- PRD v4 §7 Step 12: one-time claim links for prospect demo stores. The kit
-- carries the link; whoever opens it sets the owner's email and password.
-- Only the token's SHA-256 hash is stored. One open link per store: a new one
-- replaces the old.

CREATE TABLE store_claims (
  token_hash  text PRIMARY KEY,
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX store_claims_store_idx ON store_claims(store_id);

-- Down
-- DROP TABLE IF EXISTS store_claims;
