-- Staff photo for the "Liking" persuasion principle (face beside staff quote)
ALTER TABLE enrichments
  ADD COLUMN IF NOT EXISTS staff_photo_url text;

-- Scarcity threshold per store (when inventory drops below this, "Only X left" appears).
-- Default 5 is a sensible middle ground; store owners can tune it.
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS scarcity_threshold integer NOT NULL DEFAULT 5;
