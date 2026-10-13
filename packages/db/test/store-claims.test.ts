// PRD v4 §7 Step 12: a one-time claim link lets a prospect set up their own
// login (email and password) for their demo store, since we don't have their
// email when the kit is made.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  createStoreClaim, getOpenStoreClaim, redeemStoreClaim, hasOpenStoreClaim, verifyPassword, hashPassword,
} from "../src/index.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc" });
const domain = `claim-test-${randomUUID().slice(0, 8)}.prospect.tapshelf.co`;
const emails: string[] = [];
let storeId: string;
const email = () => { const e = `claim-${randomUUID().slice(0, 8)}@example.com`; emails.push(e); return e; };

beforeAll(async () => {
  const { rows: [s] } = await pool.query(`insert into stores (shopify_shop_domain, shopify_access_token, name) values ($1, '', 'DSW') returning id`, [domain]);
  storeId = s.id;
});
afterAll(async () => {
  await pool.query(`delete from stores where shopify_shop_domain = $1`, [domain]);
  await pool.query(`delete from store_admins where email = any($1)`, [emails]);
  await pool.end();
});

describe("store claims", () => {
  it("shows which store an open link is for", async () => {
    await createStoreClaim(pool, storeId, "hash-open", 90);
    expect(await getOpenStoreClaim(pool, "hash-open")).toEqual({ store_id: storeId, store_name: "DSW", store_domain: domain });
    expect(await hasOpenStoreClaim(pool, storeId)).toBe(true);
    expect(await getOpenStoreClaim(pool, "unknown")).toBeNull();
  });

  it("creates the owner's login from the link, once", async () => {
    await createStoreClaim(pool, storeId, "hash-once", 90);
    const who = email();
    const result = await redeemStoreClaim(pool, "hash-once", who, await hashPassword("a long password"));
    expect(result).toMatchObject({ ok: true, store_id: storeId, store_domain: domain });

    const { rows: [admin] } = await pool.query(`select store_id, password_hash from store_admins where email = $1`, [who]);
    expect(admin.store_id).toBe(storeId);
    expect(await verifyPassword("a long password", admin.password_hash)).toBe(true);

    expect(await redeemStoreClaim(pool, "hash-once", email(), await hashPassword("another one"))).toEqual({ ok: false, reason: "expired" });
    expect(await hasOpenStoreClaim(pool, storeId)).toBe(false);
  });

  it("a new link replaces the old one", async () => {
    await createStoreClaim(pool, storeId, "hash-old", 90);
    await createStoreClaim(pool, storeId, "hash-new", 90);
    expect(await getOpenStoreClaim(pool, "hash-old")).toBeNull();
    expect(await getOpenStoreClaim(pool, "hash-new")).not.toBeNull();
  });

  it("refuses expired links", async () => {
    await createStoreClaim(pool, storeId, "hash-expired", 90);
    await pool.query(`update store_claims set expires_at = now() - interval '1 minute' where token_hash = 'hash-expired'`);
    expect(await getOpenStoreClaim(pool, "hash-expired")).toBeNull();
    expect(await redeemStoreClaim(pool, "hash-expired", email(), "x")).toEqual({ ok: false, reason: "expired" });
  });

  it("keeps the link usable when the email already has a login", async () => {
    const taken = email();
    await pool.query(`insert into store_admins (store_id, email, password_hash) values ($1, $2, 'x')`, [storeId, taken]);
    await createStoreClaim(pool, storeId, "hash-taken", 90);
    expect(await redeemStoreClaim(pool, "hash-taken", taken.toUpperCase(), "x")).toEqual({ ok: false, reason: "email_taken" });
    expect(await getOpenStoreClaim(pool, "hash-taken")).not.toBeNull();
  });
});
