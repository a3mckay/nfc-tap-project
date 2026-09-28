import type { Pool } from "pg";

// A non-removed staff member together with the store they're approved at.
export interface ActiveStaff {
  id: string;
  store_id: string;
  email: string;
  name: string | null;
  store_domain: string;
  store_name: string;
}

const ACTIVE_STAFF_SELECT = `
  select s.id, s.store_id, s.email, s.name,
         st.shopify_shop_domain as store_domain,
         coalesce(st.name, st.shopify_shop_domain) as store_name
    from store_staff s
    join stores st on st.id = s.store_id
   where s.revoked_at is null`;

export async function getActiveStaffByEmail(pool: Pool, email: string): Promise<ActiveStaff[]> {
  const { rows } = await pool.query<ActiveStaff>(
    `${ACTIVE_STAFF_SELECT} and s.email = $1 order by store_name`,
    [email],
  );
  return rows;
}

export async function getActiveStaffById(pool: Pool, id: string): Promise<ActiveStaff | null> {
  const { rows } = await pool.query<ActiveStaff>(`${ACTIVE_STAFF_SELECT} and s.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createStaffSignInToken(
  pool: Pool,
  staffId: string,
  tokenHash: string,
  ttlMinutes: number,
): Promise<void> {
  await pool.query(
    `insert into staff_auth_tokens (token_hash, staff_id, expires_at)
     values ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [tokenHash, staffId, ttlMinutes],
  );
}

// Marks the token used and returns who it signs in. Null if the token is
// unknown, used, expired, or its staff member has been removed.
export async function consumeStaffSignInToken(
  pool: Pool,
  tokenHash: string,
): Promise<{ staff_id: string; store_id: string; store_domain: string } | null> {
  const { rows } = await pool.query<{ staff_id: string; store_id: string; store_domain: string }>(
    `update staff_auth_tokens t
        set used_at = now()
       from store_staff s
       join stores st on st.id = s.store_id
      where t.token_hash = $1
        and t.used_at is null
        and t.expires_at > now()
        and s.id = t.staff_id
        and s.revoked_at is null
      returning t.staff_id, s.store_id, st.shopify_shop_domain as store_domain`,
    [tokenHash],
  );
  return rows[0] ?? null;
}
