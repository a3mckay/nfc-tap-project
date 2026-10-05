-- PRD v4 §7 Step 15l: category spec fields (docs/PRD-ai-assistant.md D51).
-- The store's main industry is the fallback category; a product can override
-- the detected category; product_specs holds one value per spec field, with
-- its source. Owner-edited values survive research runs.

ALTER TABLE stores ADD COLUMN industry text;
ALTER TABLE products ADD COLUMN spec_category text;

CREATE TABLE product_specs (
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_key      text NOT NULL,
  value         text NOT NULL,
  source_url    text,
  source_kind   text NOT NULL CHECK (source_kind IN ('brand', 'retailer', 'review', 'other', 'owner')),
  owner_edited  boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, spec_key)
);
CREATE INDEX product_specs_store_idx ON product_specs(store_id);

-- Down
-- DROP TABLE IF EXISTS product_specs;
-- ALTER TABLE products DROP COLUMN IF EXISTS spec_category;
-- ALTER TABLE stores DROP COLUMN IF EXISTS industry;
