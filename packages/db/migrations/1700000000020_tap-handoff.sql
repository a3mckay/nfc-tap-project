-- PRD v4 §7 Step 13c: single-use handoff of an admin sign-in (staff member or
-- store owner) to the tap page, which is on a different domain and can't read
-- the admin's cookie. Valid for 60 seconds; only a SHA-256 hash is stored.

CREATE TABLE tap_handoff_tokens (
  token_hash      text PRIMARY KEY,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  staff_id        uuid REFERENCES store_staff(id) ON DELETE CASCADE,
  store_admin_id  uuid REFERENCES store_admins(id) ON DELETE CASCADE,
  return_path     text NOT NULL,          -- admin path to send the browser back to
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((staff_id IS NULL) <> (store_admin_id IS NULL))
);

-- Down
-- DROP TABLE IF EXISTS tap_handoff_tokens;
