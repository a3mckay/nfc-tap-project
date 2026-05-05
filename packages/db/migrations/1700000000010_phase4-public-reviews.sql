-- §4 Public Reviews & Awards (opt-in, web search)

-- Master switch + last-run timestamp on stores
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS public_reviews_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_reviews_last_run_at timestamptz;

-- Awards live in their own table (separate approval flow from reviews).
-- Approved awards render in a "Recognition" section on the tap page.
CREATE TABLE awards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title         text NOT NULL,             -- e.g. "Best New Knitwear 2026"
  awarding_body text,                       -- e.g. "Vogue", "Drapers"
  year          integer,
  source_url    text,
  source_label  text,
  status        text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','pending','rejected')),
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, source_url)
);
CREATE INDEX awards_product_idx ON awards(product_id, status);
CREATE INDEX awards_pending_idx ON awards(store_id, status) WHERE status = 'pending';
