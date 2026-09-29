-- Manager roles: a person on the Staff list can be promoted to co-manager or
-- manager. Managers and co-managers sign in to the admin with a password (set
-- from an emailed link); plain staff never have one.

ALTER TABLE store_staff
  ADD COLUMN role text NOT NULL DEFAULT 'staff'
    CHECK (role IN ('staff', 'co_manager', 'manager')),
  ADD COLUMN password_hash text;   -- same PBKDF2 format as store_admins

-- Down
-- ALTER TABLE store_staff DROP COLUMN IF EXISTS role, DROP COLUMN IF EXISTS password_hash;
