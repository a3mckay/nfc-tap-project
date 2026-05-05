-- §5 Reciprocity — store-configured offers that surface on the tap page.
-- store_offers is the *configuration*; customer_offers (already exists) is the *delivery* log.

CREATE TABLE store_offers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  -- Optional: scope to a specific product. NULL means store-wide.
  product_id    uuid REFERENCES products(id) ON DELETE CASCADE,
  code          text NOT NULL,                      -- e.g. "ALLY15"
  message       text NOT NULL DEFAULT 'You found our exclusive offer.',
  -- Trigger: when does this offer surface to a customer?
  trigger_kind  text NOT NULL CHECK (trigger_kind IN ('always','after_reaction','after_n_taps')),
  trigger_n     integer,                            -- used when trigger_kind='after_n_taps'
  enabled       boolean NOT NULL DEFAULT true,
  expires_at    timestamptz,                        -- optional offer expiry
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX store_offers_store_idx   ON store_offers(store_id) WHERE enabled = true;
CREATE INDEX store_offers_product_idx ON store_offers(product_id) WHERE enabled = true;
