// PRD v4 §7 Step 12: one-time claim links for prospect demo stores. A kit's
// link lets the prospect create the owner's login (their email and password),
// since we don't have their email when the kit is made. Tokens are stored as
// SHA-256 hashes; a link works once, until it expires.
import type { Pool } from "pg";

// Issues a new link for the store; any unused one stops working.
export async function createStoreClaim(pool: Pool, storeId: string, tokenHash: string, ttlDays: number): Promise<void> {
  await pool.query(`delete from store_claims where store_id = $1 and used_at is null`, [storeId]);
  await pool.query(
    `insert into store_claims (token_hash, store_id, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)`,
    [tokenHash, storeId, ttlDays],
  );
}

export interface OpenStoreClaim { store_id: string; store_name: string | null; store_domain: string }

const OPEN = `c.used_at is null and c.expires_at > now()`;

export async function getOpenStoreClaim(pool: Pool, tokenHash: string): Promise<OpenStoreClaim | null> {
  const { rows } = await pool.query<OpenStoreClaim>(
    `select c.store_id, s.name as store_name, s.shopify_shop_domain as store_domain
       from store_claims c join stores s on s.id = c.store_id
      where c.token_hash = $1 and ${OPEN}`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function hasOpenStoreClaim(pool: Pool, storeId: string): Promise<boolean> {
  const { rows } = await pool.query(`select 1 from store_claims c where c.store_id = $1 and ${OPEN}`, [storeId]);
  return rows.length > 0;
}

export type RedeemResult =
  | { ok: true; store_admin_id: string; store_id: string; store_domain: string }
  | { ok: false; reason: "expired" | "email_taken" };

// Uses up the link and creates the owner's login, together. If the email
// already signs in somewhere, nothing changes and the link still works.
export async function redeemStoreClaim(pool: Pool, tokenHash: string, email: string, passwordHash: string): Promise<RedeemResult> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows: [claim] } = await client.query<{ store_id: string; store_domain: string }>(
      `update store_claims c set used_at = now()
         from stores s
        where c.token_hash = $1 and ${OPEN} and s.id = c.store_id
        returning c.store_id, s.shopify_shop_domain as store_domain`,
      [tokenHash],
    );
    if (!claim) {
      await client.query("rollback");
      return { ok: false, reason: "expired" };
    }
    const { rows: [admin] } = await client.query<{ id: string }>(
      `insert into store_admins (store_id, email, password_hash) values ($1, $2, $3)
       on conflict (email) do nothing
       returning id`,
      [claim.store_id, email.toLowerCase().trim(), passwordHash],
    );
    if (!admin) {
      await client.query("rollback");
      return { ok: false, reason: "email_taken" };
    }
    await client.query("commit");
    return { ok: true, store_admin_id: admin.id, store_id: claim.store_id, store_domain: claim.store_domain };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
