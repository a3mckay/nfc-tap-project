// PRD v4 §7 Step 13c: the admin hands a staff member's or owner's sign-in to
// the tap page with a single-use token.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { approveStaffEmail, revokeStaff } from "../src/store-staff.js";
import { createStoreAdmin } from "../src/store-admins.js";
import { createTapHandoffToken, consumeTapHandoffToken, isTapPrincipalActive } from "../src/tap-handoff.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seededStores: string[] = [];
async function seedStore(): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`handoff-test-${randomUUID()}.myshopify.com`],
  );
  seededStores.push(rows[0]!.id);
  return rows[0]!.id;
}

let storeId: string;
let otherStoreId: string;
let staffId: string;
let adminId: string;
beforeEach(async () => {
  storeId = await seedStore();
  otherStoreId = await seedStore();
  staffId = (await approveStaffEmail(pool, storeId, `sam-${randomUUID()}@example.com`, null)).id;
  adminId = (await createStoreAdmin(pool, storeId, `owner-${randomUUID()}@example.com`, "pw")).id;
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seededStores]);
  await pool.end();
});

const hash = () => `h-${randomUUID()}`;

describe("tap handoff tokens", () => {
  it("hands off a staff member once, with the return path", async () => {
    const h = hash();
    await createTapHandoffToken(pool, { tokenHash: h, principal: { kind: "staff", staffId, storeId }, returnPath: "/training", ttlSeconds: 60 });
    expect(await consumeTapHandoffToken(pool, h)).toEqual({ principal: { kind: "staff", staffId, storeId }, returnPath: "/training" });
    expect(await consumeTapHandoffToken(pool, h)).toBeNull();
  });

  it("hands off a store owner", async () => {
    const h = hash();
    await createTapHandoffToken(pool, { tokenHash: h, principal: { kind: "owner", storeAdminId: adminId, storeId }, returnPath: "/tags?shop=x", ttlSeconds: 60 });
    expect(await consumeTapHandoffToken(pool, h)).toEqual({ principal: { kind: "owner", storeAdminId: adminId, storeId }, returnPath: "/tags?shop=x" });
  });

  it("rejects an expired token", async () => {
    const h = hash();
    await createTapHandoffToken(pool, { tokenHash: h, principal: { kind: "staff", staffId, storeId }, returnPath: "/training", ttlSeconds: -1 });
    expect(await consumeTapHandoffToken(pool, h)).toBeNull();
  });

  it("rejects a token for a staff member removed in the meantime", async () => {
    const h = hash();
    await createTapHandoffToken(pool, { tokenHash: h, principal: { kind: "staff", staffId, storeId }, returnPath: "/training", ttlSeconds: 60 });
    await revokeStaff(pool, staffId, storeId);
    expect(await consumeTapHandoffToken(pool, h)).toBeNull();
  });

  it("rejects an unknown token", async () => {
    expect(await consumeTapHandoffToken(pool, "nope")).toBeNull();
  });
});

describe("isTapPrincipalActive", () => {
  it("is true for an active staff member or owner of that store", async () => {
    expect(await isTapPrincipalActive(pool, { kind: "staff", staffId, storeId })).toBe(true);
    expect(await isTapPrincipalActive(pool, { kind: "owner", storeAdminId: adminId, storeId })).toBe(true);
  });

  it("is false once the staff member is removed", async () => {
    await revokeStaff(pool, staffId, storeId);
    expect(await isTapPrincipalActive(pool, { kind: "staff", staffId, storeId })).toBe(false);
  });

  it("is false when the store in the cookie isn't theirs", async () => {
    expect(await isTapPrincipalActive(pool, { kind: "staff", staffId, storeId: otherStoreId })).toBe(false);
    expect(await isTapPrincipalActive(pool, { kind: "owner", storeAdminId: adminId, storeId: otherStoreId })).toBe(false);
  });

  it("is false once the owner's login is deleted", async () => {
    await pool.query(`delete from store_admins where id = $1`, [adminId]);
    expect(await isTapPrincipalActive(pool, { kind: "owner", storeAdminId: adminId, storeId })).toBe(false);
  });
});
