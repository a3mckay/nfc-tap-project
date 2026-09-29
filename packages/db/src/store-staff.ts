import type { Pool } from "pg";

export type StaffRole = "staff" | "co_manager" | "manager";

export interface StoreStaff {
  id: string;
  store_id: string;
  email: string;
  name: string | null;
  role: StaffRole;
  created_at: Date;
  revoked_at: Date | null;
}

// Every column except password_hash, which never leaves the database layer.
const STAFF_COLUMNS = "id, store_id, email, name, role, created_at, revoked_at";

// Approves an email for the store. Re-approving an existing email updates the
// name; re-approving a removed one restores it as plain staff.
export async function approveStaffEmail(
  pool: Pool,
  storeId: string,
  email: string,
  name: string | null,
): Promise<StoreStaff> {
  const { rows } = await pool.query<StoreStaff>(
    `insert into store_staff (store_id, email, name) values ($1, $2, $3)
     on conflict (store_id, email) do update set
       name          = excluded.name,
       role          = case when store_staff.revoked_at is null then store_staff.role else 'staff' end,
       password_hash = case when store_staff.revoked_at is null then store_staff.password_hash else null end,
       revoked_at    = null
     returning ${STAFF_COLUMNS}`,
    [storeId, email, name],
  );
  return rows[0]!;
}

export async function getActiveStaffByStore(pool: Pool, storeId: string): Promise<StoreStaff[]> {
  const { rows } = await pool.query<StoreStaff>(
    `select ${STAFF_COLUMNS} from store_staff
      where store_id = $1 and revoked_at is null
      order by created_at, email`,
    [storeId],
  );
  return rows;
}

// Returns false when the staff member isn't the store's (or is already removed).
export async function revokeStaff(pool: Pool, id: string, storeId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update store_staff set revoked_at = now()
      where id = $1 and store_id = $2 and revoked_at is null`,
    [id, storeId],
  );
  return (rowCount ?? 0) > 0;
}

// One active person on the store's Staff list, or null.
export async function getStaffMember(pool: Pool, id: string, storeId: string): Promise<StoreStaff | null> {
  const { rows } = await pool.query<StoreStaff>(
    `select ${STAFF_COLUMNS} from store_staff where id = $1 and store_id = $2 and revoked_at is null`,
    [id, storeId],
  );
  return rows[0] ?? null;
}

// Changes an active staff member's role. Going back to plain staff also removes
// their password, so they can no longer sign in to the admin.
export async function setStaffRole(pool: Pool, id: string, storeId: string, role: StaffRole): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update store_staff
        set role = $3,
            password_hash = case when $3 = 'staff' then null else password_hash end
      where id = $1 and store_id = $2 and revoked_at is null`,
    [id, storeId, role],
  );
  return (rowCount ?? 0) > 0;
}
