-- Managers and co-managers set their password from an emailed single-use link.
-- These share staff_auth_tokens with staff sign-in links; `purpose` keeps the two
-- from being used for each other.

ALTER TABLE staff_auth_tokens
  ADD COLUMN purpose text NOT NULL DEFAULT 'sign_in'
    CHECK (purpose IN ('sign_in', 'set_password'));

-- Down
-- ALTER TABLE staff_auth_tokens DROP COLUMN IF EXISTS purpose;
