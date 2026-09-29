-- PRD v4 §7 Step 13e: staff training notes, one row per product. Every field is
-- optional and written by the store owner. Kept separate from `enrichments`,
-- which holds customer-facing copy.

CREATE TABLE product_training (
  product_id             uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  store_id               uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  one_line_sell          text,
  who_its_for            text,
  who_its_not_for        text,
  fit_and_sizing         text,
  worth_the_price        text[] NOT NULL DEFAULT '{}',   -- 2-3 reasons
  closest_alternative    text,
  common_questions       jsonb NOT NULL DEFAULT '[]',    -- [{question, answer}], 3-5
  companion_products     text,
  brand_context          text,
  stock_note             text,
  stock_note_updated_at  timestamptz,                    -- set when stock_note changes
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_training_store_idx ON product_training(store_id);

-- Down
-- DROP TABLE IF EXISTS product_training;
