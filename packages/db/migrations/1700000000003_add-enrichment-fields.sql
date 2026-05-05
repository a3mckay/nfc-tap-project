-- Up Migration
ALTER TABLE enrichments
  ADD COLUMN IF NOT EXISTS care_instructions   text,
  ADD COLUMN IF NOT EXISTS sustainability_notes text,
  ADD COLUMN IF NOT EXISTS reviews             jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS awards              jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faq                 jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Down Migration
ALTER TABLE enrichments
  DROP COLUMN IF EXISTS care_instructions,
  DROP COLUMN IF EXISTS sustainability_notes,
  DROP COLUMN IF EXISTS reviews,
  DROP COLUMN IF EXISTS awards,
  DROP COLUMN IF EXISTS faq;
