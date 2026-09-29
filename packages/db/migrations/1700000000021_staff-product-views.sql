-- PRD v4 §7 Step 13f: each time a staff member opens a product's training view.
-- Drives training progress ("31 of 40 products reviewed"). Store owners' own
-- taps aren't recorded.

CREATE TABLE staff_product_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid NOT NULL REFERENCES store_staff(id) ON DELETE CASCADE,
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_product_views_staff_idx ON staff_product_views(staff_id, product_id);
CREATE INDEX staff_product_views_store_idx ON staff_product_views(store_id);

-- Down
-- DROP TABLE IF EXISTS staff_product_views;
