-- Add store-scoped sequential tag_number to tags
-- Each store has its own sequence: #1, #2, #3, ...

ALTER TABLE tags
  ADD COLUMN tag_number bigint;

-- Backfill: assign sequential numbers within each store, ordered by creation time
UPDATE tags t
SET tag_number = sub.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY encoded_at ASC NULLS LAST, id ASC) AS rn
  FROM tags
) sub
WHERE t.id = sub.id;

-- Now make it NOT NULL and add the uniqueness constraint
ALTER TABLE tags
  ALTER COLUMN tag_number SET NOT NULL,
  ADD CONSTRAINT tags_store_id_tag_number_key UNIQUE (store_id, tag_number);
