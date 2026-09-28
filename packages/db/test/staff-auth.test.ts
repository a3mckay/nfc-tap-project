// PRD v4 §7 Step 13b: staff sign-in by emailed single-use link.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { approveStaffEmail, revokeStaff } from "../src/store-staff.js";
import {
  getActiveStaffByEmail, getActiveStaffById,
  createStaffSignInToken, consumeStaffSignInToken,
} from "../src/staff-auth.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seededStores: string[] = [];
async function seedStore(name: string): Promise<{ id: string; domain: string }> {
  const domain = `auth-test-${randomUUID()}.myshopify.com`;
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token, name) values ($1, 'x', $2) returning id`,
    [domain, name],
  );
  seededStores.push(rows[0]!.id);
  return { id: rows[0]!.id, domain };
}

let email: string;
beforeEach(() => {
  email = `sam-${randomUUID()}@example.com`;
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seededStores]);
  await pool.end();
});

describe("getActiveStaffByEmail", () => {
  it("returns every store the email is approved at, with store details", async () => {
    const a = await seedStore("Alpha");
    const b = await seedStore("Beta");
    await approveStaffEmail(pool, a.id, email, "Sam");
    await approveStaffEmail(pool, b.id, email, null);
    const rows = await getActiveStaffByEmail(pool, email);
    expect(rows.map((r) => r.store_name).sort()).toEqual(["Alpha", "Beta"]);
    expect(rows.find((r) => r.store_id === a.id)).toMatchObject({ store_domain: a.domain, name: "Sam" });
  });

  it("skips removed staff and unknown emails", async () => {
    const a = await seedStore("Alpha");
    const s = await approveStaffEmail(pool, a.id, email, null);
    await revokeStaff(pool, s.id, a.id);
    expect(await getActiveStaffByEmail(pool, email)).toEqual([]);
    expect(await getActiveStaffByEmail(pool, "nobody@example.com")).toEqual([]);
  });
});

describe("staff sign-in tokens", () => {
  it("a token signs in its staff member once", async () => {
    const a = await seedStore("Alpha");
    const s = await approveStaffEmail(pool, a.id, email, "Sam");
    await createStaffSignInToken(pool, s.id, "hash-1", 15);
    const first = await consumeStaffSignInToken(pool, "hash-1");
    expect(first).toMatchObject({ staff_id: s.id, store_id: a.id, store_domain: a.domain });
    expect(await consumeStaffSignInToken(pool, "hash-1")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const a = await seedStore("Alpha");
    const s = await approveStaffEmail(pool, a.id, email, null);
    await createStaffSignInToken(pool, s.id, "hash-2", -1);
    expect(await consumeStaffSignInToken(pool, "hash-2")).toBeNull();
  });

  it("rejects a token once the staff member is removed", async () => {
    const a = await seedStore("Alpha");
    const s = await approveStaffEmail(pool, a.id, email, null);
    await createStaffSignInToken(pool, s.id, "hash-3", 15);
    await revokeStaff(pool, s.id, a.id);
    expect(await consumeStaffSignInToken(pool, "hash-3")).toBeNull();
  });

  it("rejects an unknown token", async () => {
    expect(await consumeStaffSignInToken(pool, "no-such-hash")).toBeNull();
  });
});

describe("getActiveStaffById", () => {
  it("returns an active staff member with their store, and null once removed", async () => {
    const a = await seedStore("Alpha");
    const s = await approveStaffEmail(pool, a.id, email, "Sam");
    expect(await getActiveStaffById(pool, s.id)).toMatchObject({ id: s.id, email, name: "Sam", store_name: "Alpha" });
    await revokeStaff(pool, s.id, a.id);
    expect(await getActiveStaffById(pool, s.id)).toBeNull();
  });
});
