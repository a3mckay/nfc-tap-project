import type { Pool } from "pg";

export interface StoreStaff {
  id: string;
  store_id: string;
  email: string;
  name: string | null;
  created_at: Date;
  revoked_at: Date | null;
}

// Approves an email for the store. Re-approving an existing or removed email
// restores it and updates the name.
export async function approveStaffEmail(
  pool: Pool,
  storeId: string,
  email: string,
  name: string | null,
): Promise<StoreStaff> {
  const { rows } = await pool.query<StoreStaff>(
    `insert into store_staff (store_id, email, name) values ($1, $2, $3)
     on conflict (store_id, email)
       do update set name = excluded.name, revoked_at = null
     returning *`,
    [storeId, email, name],
  );
  return rows[0]!;
}

export async function getActiveStaffByStore(pool: Pool, storeId: string): Promise<StoreStaff[]> {
  const { rows } = await pool.query<StoreStaff>(
    `select * from store_staff
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
