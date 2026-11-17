-- "Goes great with" (founder, 2026-11-16): up to three of the store's own
-- products that a product needs or suits. The AI picks them at Generate, each
-- with a reason taken from a source on the product's fact sheet. A pairing the
-- owner removes is kept as removed, so a new run doesn't bring it back.

CREATE TABLE product_pairings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id         uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  paired_product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reason             text NOT NULL,
  source_url         text,
  source_kind        text NOT NULL CHECK (source_kind IN ('brand', 'reference', 'retailer', 'review', 'other', 'owner')),
  position           integer NOT NULL DEFAULT 0,
  removed_by_owner   boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, paired_product_id),
  CHECK (product_id <> paired_product_id)
);
CREATE INDEX product_pairings_product_idx ON product_pairings(product_id);

-- Down
-- DROP TABLE IF EXISTS product_pairings;
