-- PRD v4 §7 Step 13a: staff emails approved by the store admin.
-- Staff can't sign up on their own; only emails listed here can sign in as staff.
-- The same email may be approved at more than one store.
-- Removing a staff member sets revoked_at (kept for training history).

CREATE TABLE store_staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email       text NOT NULL,          -- stored lower-cased by the admin
  name        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz,
  UNIQUE (store_id, email)
);
CREATE INDEX store_staff_email_idx ON store_staff(email);

-- Down
-- DROP TABLE IF EXISTS store_staff;
