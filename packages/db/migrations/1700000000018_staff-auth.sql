-- PRD v4 §7 Step 13b: single-use staff sign-in links.
-- Only a SHA-256 hash of the token is stored; the token itself is only in the email.
-- Each token signs in one store_staff row, so an email approved at several stores
-- gets one link per store.

CREATE TABLE staff_auth_tokens (
  token_hash  text PRIMARY KEY,
  staff_id    uuid NOT NULL REFERENCES store_staff(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_auth_tokens_staff_idx ON staff_auth_tokens(staff_id);

-- Down
-- DROP TABLE IF EXISTS staff_auth_tokens;
