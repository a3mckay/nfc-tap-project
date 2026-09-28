// PRD v4 §7 Step 13a: staff emails approved by the store admin.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { approveStaffEmail, getActiveStaffByStore, revokeStaff } from "../src/store-staff.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seededStores: string[] = [];
async function seedStore(): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`staff-test-${randomUUID()}.myshopify.com`],
  );
  seededStores.push(rows[0]!.id);
  return rows[0]!.id;
}

let own: string;
let other: string;
beforeEach(async () => {
  own = await seedStore();
  other = await seedStore();
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seededStores]);
  await pool.end();
});

describe("approveStaffEmail", () => {
  it("adds an approved email with an optional name", async () => {
    const staff = await approveStaffEmail(pool, own, "sam@example.com", "Sam");
    expect(staff).toMatchObject({ store_id: own, email: "sam@example.com", name: "Sam", revoked_at: null });
    expect((await getActiveStaffByStore(pool, own)).map((s) => s.email)).toEqual(["sam@example.com"]);
  });

  it("is idempotent for the same store and email", async () => {
    const first = await approveStaffEmail(pool, own, "sam@example.com", null);
    const again = await approveStaffEmail(pool, own, "sam@example.com", "Sam");
    expect(again.id).toBe(first.id);
    expect(again.name).toBe("Sam");
    expect(await getActiveStaffByStore(pool, own)).toHaveLength(1);
  });

  it("restores a previously removed email", async () => {
    const first = await approveStaffEmail(pool, own, "sam@example.com", null);
    await revokeStaff(pool, first.id, own);
    const again = await approveStaffEmail(pool, own, "sam@example.com", null);
    expect(again.id).toBe(first.id);
    expect(again.revoked_at).toBeNull();
  });

  it("allows the same email at two stores", async () => {
    await approveStaffEmail(pool, own, "sam@example.com", null);
    await approveStaffEmail(pool, other, "sam@example.com", null);
    expect(await getActiveStaffByStore(pool, own)).toHaveLength(1);
    expect(await getActiveStaffByStore(pool, other)).toHaveLength(1);
  });
});

describe("getActiveStaffByStore", () => {
  it("lists only the store's non-removed staff, oldest first", async () => {
    await approveStaffEmail(pool, own, "a@example.com", null);
    const b = await approveStaffEmail(pool, own, "b@example.com", null);
    await approveStaffEmail(pool, own, "c@example.com", null);
    await approveStaffEmail(pool, other, "x@example.com", null);
    await revokeStaff(pool, b.id, own);
    expect((await getActiveStaffByStore(pool, own)).map((s) => s.email)).toEqual(["a@example.com", "c@example.com"]);
  });
});

describe("revokeStaff", () => {
  it("removes the store's own staff member", async () => {
    const s = await approveStaffEmail(pool, own, "sam@example.com", null);
    expect(await revokeStaff(pool, s.id, own)).toBe(true);
    expect(await getActiveStaffByStore(pool, own)).toEqual([]);
  });

  it("does not touch another store's staff member", async () => {
    const s = await approveStaffEmail(pool, other, "sam@example.com", null);
    expect(await revokeStaff(pool, s.id, own)).toBe(false);
    expect(await getActiveStaffByStore(pool, other)).toHaveLength(1);
  });
});
