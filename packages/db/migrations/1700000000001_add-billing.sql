-- Up Migration

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS tier             text NOT NULL DEFAULT 'free'
                                            CHECK (tier IN ('free','starter','pro','enterprise')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id  text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS tier_expires_at  timestamptz;

-- Down Migration
ALTER TABLE stores
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS tier_expires_at;
