import type { Pool } from "pg";

// Who is signed in on the tap page as store staff (PRD v4 §7 Step 13c).
export type TapPrincipal =
  | { kind: "staff"; staffId: string; storeId: string }
  | { kind: "owner"; storeAdminId: string; storeId: string };

export async function createTapHandoffToken(
  pool: Pool,
  t: { tokenHash: string; principal: TapPrincipal; returnPath: string; ttlSeconds: number },
): Promise<void> {
  const p = t.principal;
  await pool.query(
    `insert into tap_handoff_tokens (token_hash, store_id, staff_id, store_admin_id, return_path, expires_at)
     values ($1, $2, $3, $4, $5, now() + ($6 || ' seconds')::interval)`,
    [
      t.tokenHash, p.storeId,
      p.kind === "staff" ? p.staffId : null,
      p.kind === "owner" ? p.storeAdminId : null,
      t.returnPath, t.ttlSeconds,
    ],
  );
}

// The token's holder must still be active: a staff member not removed from that
// store, or a store owner login that still exists for it.
const ACTIVE = `
  ((t.staff_id is not null and exists (
      select 1 from store_staff s where s.id = t.staff_id and s.store_id = t.store_id and s.revoked_at is null))
   or (t.store_admin_id is not null and exists (
      select 1 from store_admins a where a.id = t.store_admin_id and a.store_id = t.store_id)))`;

// Marks the token used and returns who it signs in. Null if it's unknown, used,
// expired, or its holder is no longer active.
export async function consumeTapHandoffToken(
  pool: Pool,
  tokenHash: string,
): Promise<{ principal: TapPrincipal; returnPath: string } | null> {
  const { rows } = await pool.query<{
    store_id: string; staff_id: string | null; store_admin_id: string | null; return_path: string;
  }>(
    `update tap_handoff_tokens t
        set used_at = now()
      where t.token_hash = $1
        and t.used_at is null
        and t.expires_at > now()
        and ${ACTIVE}
      returning t.store_id, t.staff_id, t.store_admin_id, t.return_path`,
    [tokenHash],
  );
  const r = rows[0];
  if (!r) return null;
  const principal: TapPrincipal = r.staff_id
    ? { kind: "staff", staffId: r.staff_id, storeId: r.store_id }
    : { kind: "owner", storeAdminId: r.store_admin_id!, storeId: r.store_id };
  return { principal, returnPath: r.return_path };
}

export async function isTapPrincipalActive(pool: Pool, p: TapPrincipal): Promise<boolean> {
  const { rows } = await pool.query(
    p.kind === "staff"
      ? `select 1 from store_staff where id = $1 and store_id = $2 and revoked_at is null`
      : `select 1 from store_admins where id = $1 and store_id = $2`,
    [p.kind === "staff" ? p.staffId : p.storeAdminId, p.storeId],
  );
  return rows.length > 0;
}
