-- Track the URL used for brand detection and store pending suggestions
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS brand_detect_url       text,
  ADD COLUMN IF NOT EXISTS brand_checked_at        timestamptz,
  ADD COLUMN IF NOT EXISTS brand_pending_suggestion jsonb;
