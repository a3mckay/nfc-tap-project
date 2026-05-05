-- Allow manually created products (no Shopify ID)
ALTER TABLE products
  ALTER COLUMN shopify_product_id DROP NOT NULL,
  ALTER COLUMN shopify_updated_at DROP NOT NULL;

-- Flag products created manually (never overwritten by Shopify sync)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false;

-- Soft-delete: set deleted_at instead of hard-deleting so enrichment data is preserved
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
