-- PRD v4 §7 Step 15g: when a store's team last opened a product on the
-- Questions tab. Questions asked after that are "new" (docs/PRD-ai-assistant.md
-- §9.0 Q5: opening a product clears its "new" badge).

CREATE TABLE product_question_reviews (
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reviewed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, product_id)
);

-- Down
-- DROP TABLE IF EXISTS product_question_reviews;
