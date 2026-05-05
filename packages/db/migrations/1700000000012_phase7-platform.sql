-- §7 Platform field — drives which integrations are automatic vs manual.
-- Default 'shopify' to match existing behaviour; existing stores were Shopify-only.

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'shopify'
    CHECK (platform IN ('shopify', 'woocommerce', 'squarespace', 'other'));
