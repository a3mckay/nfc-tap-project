-- PRD v4 §7 Step 15k: things on a product the store should check
-- (docs/PRD-ai-assistant.md D49, D50): contradictions between the store's own
-- notes, and research findings that don't fit the product's title or type.

CREATE TABLE product_review_flags (
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('contradiction', 'mismatch')),
  messages    jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, product_id, kind)
);

-- Down
-- DROP TABLE IF EXISTS product_review_flags;
