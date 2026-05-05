-- §3 Reviews integrations
-- One row per (store, provider) tracking what we're connected to and when we last synced.

CREATE TABLE review_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider      text NOT NULL CHECK (provider IN ('judgeme','loox','okendo','yotpo','stamped','public_search','manual')),
  -- Provider-specific config (e.g. Judge.me shop_domain, Yotpo app_key, etc.) stored as JSON
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, provider)
);

-- External reviews pulled from connected providers OR public web search.
-- Manually entered reviews stay in enrichments.reviews (existing schema).
CREATE TABLE external_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  provider      text NOT NULL,
  external_id   text,
  author        text,
  author_avatar_url text,
  rating        numeric(2,1),
  title         text,
  body          text NOT NULL,
  source_url    text,
  source_label  text,
  published_at  timestamptz,
  -- Approval status: 'approved' shown publicly, 'pending' awaiting review (used for public_search results)
  status        text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','pending','rejected')),
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id, product_id)
);
CREATE INDEX external_reviews_product_idx ON external_reviews(product_id, status);
CREATE INDEX external_reviews_pending_idx ON external_reviews(store_id, status) WHERE status = 'pending';
