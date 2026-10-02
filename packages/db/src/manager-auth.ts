import type { Pool } from "pg";
import type { StaffRole } from "./store-staff.js";

// Managers and co-managers: people on the Staff list promoted by the owner,
// who sign in to the admin with a password set from an emailed link.

export async function createSetPasswordToken(
  pool: Pool,
  staffId: string,
  tokenHash: string,
  ttlMinutes: number,
): Promise<void> {
  await pool.query(
    `insert into staff_auth_tokens (token_hash, staff_id, purpose, expires_at)
     values ($1, $2, 'set_password', now() + ($3 || ' minutes')::interval)`,
    [tokenHash, staffId, ttlMinutes],
  );
}

export interface ManagerIdentity {
  staff_id: string;
  store_id: string;
  store_domain: string;
  role: Exclude<StaffRole, "staff">;
}

// Uses up a set-password link. Null if it's unknown, used, expired, or the
// person is no longer a manager or co-manager.
export async function consumeSetPasswordToken(pool: Pool, tokenHash: string): Promise<ManagerIdentity | null> {
  const { rows } = await pool.query<ManagerIdentity>(
    `update staff_auth_tokens t
        set used_at = now()
       from store_staff s
       join stores st on st.id = s.store_id
      where t.token_hash = $1
        and t.purpose = 'set_password'
        and t.used_at is null
        and t.expires_at > now()
        and s.id = t.staff_id
        and s.revoked_at is null
        and s.role in ('manager', 'co_manager')
      returning s.id as staff_id, s.store_id, st.shopify_shop_domain as store_domain, s.role`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

// Stores a password hash for a current manager or co-manager.
export async function setStaffPassword(pool: Pool, staffId: string, storeId: string, passwordHash: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update store_staff set password_hash = $3
      where id = $1 and store_id = $2 and revoked_at is null and role in ('manager', 'co_manager')`,
    [staffId, storeId, passwordHash],
  );
  return (rowCount ?? 0) > 0;
}

export interface ManagerLogin extends ManagerIdentity {
  id: string;
  password_hash: string;
}

// Active managers and co-managers with this email and a password set, across
// stores (an email can be on more than one store's list).
export async function getManagerLoginsByEmail(pool: Pool, email: string): Promise<ManagerLogin[]> {
  const { rows } = await pool.query<ManagerLogin>(
    `select s.id, s.id as staff_id, s.store_id, st.shopify_shop_domain as store_domain, s.role, s.password_hash
       from store_staff s
       join stores st on st.id = s.store_id
      where s.email = $1 and s.revoked_at is null
        and s.role in ('manager', 'co_manager') and s.password_hash is not null
      order by s.created_at`,
    [email.trim().toLowerCase()],
  );
  return rows;
}
