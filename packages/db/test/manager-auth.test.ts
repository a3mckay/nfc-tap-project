// Managers and co-managers set a password from an emailed link, then sign in with it.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { approveStaffEmail, setStaffRole, revokeStaff } from "../src/store-staff.js";
import { createStaffSignInToken, consumeStaffSignInToken } from "../src/staff-auth.js";
import {
  createSetPasswordToken, consumeSetPasswordToken, setStaffPassword, getManagerLoginsByEmail,
} from "../src/manager-auth.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seeded: string[] = [];
async function seedStore(name: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token, name) values ($1, 'x', $2) returning id`,
    [`mgr-test-${randomUUID()}.myshopify.com`, name],
  );
  seeded.push(rows[0]!.id);
  return rows[0]!.id;
}

let store: string;
let email: string;
let staffId: string;
beforeEach(async () => {
  store = await seedStore("Alpha");
  email = `m-${randomUUID()}@example.com`;
  staffId = (await approveStaffEmail(pool, store, email, "Morgan")).id;
  await setStaffRole(pool, staffId, store, "manager");
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

const h = () => `h-${randomUUID()}`;

describe("set-password links", () => {
  it("work once for a manager, returning who they are", async () => {
    const hash = h();
    await createSetPasswordToken(pool, staffId, hash, 60);
    expect(await consumeSetPasswordToken(pool, hash)).toMatchObject({ staff_id: staffId, store_id: store, role: "manager" });
    expect(await consumeSetPasswordToken(pool, hash)).toBeNull();
  });

  it("stop working if they're demoted to staff or removed", async () => {
    const a = h(); const b = h();
    await createSetPasswordToken(pool, staffId, a, 60);
    await createSetPasswordToken(pool, staffId, b, 60);
    await setStaffRole(pool, staffId, store, "staff");
    expect(await consumeSetPasswordToken(pool, a)).toBeNull();
    await setStaffRole(pool, staffId, store, "co_manager");
    await revokeStaff(pool, staffId, store);
    expect(await consumeSetPasswordToken(pool, b)).toBeNull();
  });

  it("can't be used as a staff sign-in link, and vice versa", async () => {
    const a = h(); const b = h();
    await createSetPasswordToken(pool, staffId, a, 60);
    expect(await consumeStaffSignInToken(pool, a)).toBeNull();
    await createStaffSignInToken(pool, staffId, b, 15);
    expect(await consumeSetPasswordToken(pool, b)).toBeNull();
  });

  it("expire", async () => {
    const a = h();
    await createSetPasswordToken(pool, staffId, a, -1);
    expect(await consumeSetPasswordToken(pool, a)).toBeNull();
  });
});

describe("manager sign-in", () => {
  it("finds a manager with a password by email", async () => {
    expect(await getManagerLoginsByEmail(pool, email)).toEqual([]);
    expect(await setStaffPassword(pool, staffId, store, "hashed")).toBe(true);
    const logins = await getManagerLoginsByEmail(pool, email);
    expect(logins).toHaveLength(1);
    expect(logins[0]).toMatchObject({ id: staffId, store_id: store, role: "manager", password_hash: "hashed" });
    expect(logins[0]!.store_domain).toContain("mgr-test-");
  });

  it("won't set a password for plain staff", async () => {
    await setStaffRole(pool, staffId, store, "staff");
    expect(await setStaffPassword(pool, staffId, store, "hashed")).toBe(false);
  });

  it("leaves out demoted or removed people", async () => {
    await setStaffPassword(pool, staffId, store, "hashed");
    await revokeStaff(pool, staffId, store);
    expect(await getManagerLoginsByEmail(pool, email)).toEqual([]);
  });
});
