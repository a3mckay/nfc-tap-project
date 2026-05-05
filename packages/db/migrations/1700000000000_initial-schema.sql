-- Up Migration
-- Initial schema covering PRD §7.2 (core) and §13.6 (data intelligence layer).
-- One greenfield migration; future schema changes are additive in new files.
-- gen_random_uuid() is in core Postgres 13+; no extension needed.

-- ---------- §7.2 + §13.6 stores ----------
CREATE TABLE stores (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_shop_domain    text NOT NULL UNIQUE,
  shopify_access_token   text NOT NULL,
  theme_settings         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  data_sharing_opted_in  boolean NOT NULL DEFAULT true,
  store_city             text,
  store_neighborhood     text,
  store_lat              double precision,
  store_lng              double precision
);

-- ---------- §7.2 products ----------
CREATE TABLE products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_product_id  text NOT NULL,
  title               text NOT NULL,
  description_html    text,
  vendor              text,
  product_type        text,
  images              jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants            jsonb NOT NULL DEFAULT '[]'::jsonb,
  inventory_quantity  integer NOT NULL DEFAULT 0,
  status              text NOT NULL,
  shopify_updated_at  timestamptz NOT NULL,
  UNIQUE (store_id, shopify_product_id)
);
CREATE INDEX products_store_id_idx ON products(store_id);

-- ---------- §7.2 enrichments ----------
CREATE TABLE enrichments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  fit_notes             text,
  materials             text,
  backstory             text,
  reasons_to_buy        jsonb NOT NULL DEFAULT '[]'::jsonb,
  staff_quote           text,
  staff_name            text,
  video_url             text,
  extra_images          jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_staff_notes  text,
  ai_generated          boolean NOT NULL DEFAULT false,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------- §7.2 tags ----------
CREATE TABLE tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tag_uuid     uuid NOT NULL UNIQUE,
  product_id   uuid REFERENCES products(id) ON DELETE SET NULL,
  status       text NOT NULL CHECK (status IN ('active','oos','unassigned','disabled')),
  encoded_at   timestamptz,
  shipped_at   timestamptz,
  deployed_at  timestamptz
);
CREATE INDEX tags_store_id_idx ON tags(store_id);
CREATE INDEX tags_product_id_idx ON tags(product_id);

-- ---------- §7.2 + §13.6 tap_events ----------
-- bigserial id chosen for high-write volume; PRD does not specify type.
-- No PII per §7.3: session_id is an opaque first-party cookie value.
CREATE TABLE tap_events (
  id                    bigserial PRIMARY KEY,
  tag_id                uuid NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  product_id            uuid REFERENCES products(id) ON DELETE SET NULL,
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  session_id            text NOT NULL,
  timestamp             timestamptz NOT NULL DEFAULT now(),
  device_type           text,
  dwell_seconds         integer,
  canonical_product_id  uuid,
  brand_id              uuid,
  price_tier            varchar(32),
  enriched_at           timestamptz
);
CREATE INDEX tap_events_store_id_timestamp_idx ON tap_events(store_id, timestamp);
CREATE INDEX tap_events_product_id_idx ON tap_events(product_id);
CREATE INDEX tap_events_session_id_idx ON tap_events(session_id);

-- ---------- §7.2 orders_cache ----------
CREATE TABLE orders_cache (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_order_id  text NOT NULL,
  line_items        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL,
  UNIQUE (store_id, shopify_order_id)
);
CREATE INDEX orders_cache_store_id_created_at_idx ON orders_cache(store_id, created_at);

-- ---------- §13.6 brands ----------
CREATE TABLE brands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  category    text,
  tier        text,
  website     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- §13.6 canonical_products ----------
CREATE TABLE canonical_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name_normalized  text NOT NULL,
  product_type     text,
  sku_patterns     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, name_normalized)
);

-- Backfill the FK on tap_events now that target tables exist.
ALTER TABLE tap_events
  ADD CONSTRAINT tap_events_canonical_product_id_fkey
    FOREIGN KEY (canonical_product_id) REFERENCES canonical_products(id) ON DELETE SET NULL,
  ADD CONSTRAINT tap_events_brand_id_fkey
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- ---------- §13.6 product_canonical_map ----------
CREATE TABLE product_canonical_map (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id      uuid NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  canonical_product_id  uuid NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  match_method          text NOT NULL,
  confidence_score      numeric(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reviewed              boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_canonical_map_canonical_idx ON product_canonical_map(canonical_product_id);

-- ---------- §13.6 daily_product_taps ----------
CREATE TABLE daily_product_taps (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id            uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  canonical_product_id  uuid REFERENCES canonical_products(id) ON DELETE SET NULL,
  date                  date NOT NULL,
  tap_count             integer NOT NULL DEFAULT 0,
  unique_tap_count      integer NOT NULL DEFAULT 0,
  avg_dwell_seconds     numeric(10,2) NOT NULL DEFAULT 0,
  oos_tap_count         integer NOT NULL DEFAULT 0,
  UNIQUE (store_id, product_id, date)
);
CREATE INDEX daily_product_taps_date_idx ON daily_product_taps(date);

-- ---------- §13.6 weekly_brand_taps ----------
CREATE TABLE weekly_brand_taps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  week_start          date NOT NULL,
  network_tap_count   integer NOT NULL DEFAULT 0,
  unique_store_count  integer NOT NULL DEFAULT 0,
  avg_dwell_seconds   numeric(10,2) NOT NULL DEFAULT 0,
  UNIQUE (brand_id, week_start)
);

-- ---------- §13.6 brand_dashboard_subscriptions ----------
CREATE TABLE brand_dashboard_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  brand_name  text NOT NULL,
  brand_email text NOT NULL,
  tier        text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- §13.6 data_access_audit ----------
CREATE TABLE data_access_audit (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_type      text NOT NULL CHECK (accessor_type IN ('brand','internal','report')),
  accessor_id        text,
  query_description  text NOT NULL,
  accessed_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX data_access_audit_accessed_at_idx ON data_access_audit(accessed_at);


-- Down Migration
DROP TABLE IF EXISTS data_access_audit;
DROP TABLE IF EXISTS brand_dashboard_subscriptions;
DROP TABLE IF EXISTS weekly_brand_taps;
DROP TABLE IF EXISTS daily_product_taps;
DROP TABLE IF EXISTS product_canonical_map;
ALTER TABLE IF EXISTS tap_events
  DROP CONSTRAINT IF EXISTS tap_events_canonical_product_id_fkey,
  DROP CONSTRAINT IF EXISTS tap_events_brand_id_fkey;
DROP TABLE IF EXISTS canonical_products;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS orders_cache;
DROP TABLE IF EXISTS tap_events;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS enrichments;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS stores;
