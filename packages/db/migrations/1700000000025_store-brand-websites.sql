-- PRD v4 §7 Step 15b: each store's brand websites, used by the AI research
-- tool to search the brand's own site first (docs/PRD-ai-assistant.md §6.2).
-- `brands.website` is shared across stores; this is the store's own view of it.
-- `confirmed` is true once an owner or manager has set or checked it; found-by-
-- search domains are saved unconfirmed so they aren't searched for every time.

CREATE TABLE store_brand_websites (
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  vendor_key  text NOT NULL,   -- lower(trim(vendor))
  website     text NOT NULL,
  confirmed   boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, vendor_key)
);

-- Down
-- DROP TABLE IF EXISTS store_brand_websites;
