-- Photo upload (founder, 2026-11-16): product photos owners upload in the admin.
-- The bytes live here and the tap page serves them at /img/<id>. One row per
-- store per photo: the SHA-256 of the bytes stops the same photo being stored twice.

CREATE TABLE uploaded_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  content_type  text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  sha256        text NOT NULL,
  bytes         bytea NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, sha256)
);

-- Down
-- DROP TABLE IF EXISTS uploaded_images;
