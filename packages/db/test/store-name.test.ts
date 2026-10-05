// The store's display name: shown to customers on tap pages, in the chat, and
// in link previews. Owners set it in Settings.
import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { setStoreName } from "../src/stores.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc" });
const seeded: string[] = [];

async function seedStore(): Promise<string> {
  const { rows: [s] } = await pool.query<{ id: string }>(`insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`, [`name-test-${randomUUID()}.myshopify.com`]);
  seeded.push(s!.id);
  return s!.id;
}
const nameOf = async (id: string) => (await pool.query<{ name: string | null }>(`select name from stores where id = $1`, [id])).rows[0]!.name;

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

describe("setStoreName", () => {
  it("saves the name trimmed, and only for that store", async () => {
    const own = await seedStore();
    const other = await seedStore();
    await setStoreName(pool, own, "  Queen West Shoes ");
    expect(await nameOf(own)).toBe("Queen West Shoes");
    expect(await nameOf(other)).toBeNull();
  });

  it("clears the name when it's blank", async () => {
    const own = await seedStore();
    await setStoreName(pool, own, "Queen West Shoes");
    await setStoreName(pool, own, "   ");
    expect(await nameOf(own)).toBeNull();
  });
});
