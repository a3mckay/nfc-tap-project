// PRD v4 §7 Step 15k: contradiction and mismatch flags on a product
// (docs/PRD-ai-assistant.md D49, D50).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { getReviewFlags, saveReviewFlags } from "../src/review-flags.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });
const seeded: string[] = [];

async function seed(): Promise<{ storeId: string; productId: string }> {
  const { rows: [s] } = await pool.query<{ id: string }>(`insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`, [`flags-test-${randomUUID()}.myshopify.com`]);
  seeded.push(s!.id);
  const { rows: [p] } = await pool.query<{ id: string }>(`insert into products (store_id, title, status) values ($1, 'Easy Pointelle Shirt', 'active') returning id`, [s!.id]);
  return { storeId: s!.id, productId: p!.id };
}

let own: { storeId: string; productId: string };
let other: { storeId: string; productId: string };
beforeEach(async () => { own = await seed(); other = await seed(); });
afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

describe("review flags", () => {
  it("replaces flags of one kind and keeps the other kind", async () => {
    await saveReviewFlags(pool, own.storeId, own.productId, "contradiction", ["Fit notes say true to size; training notes say it runs large."]);
    await saveReviewFlags(pool, own.storeId, own.productId, "mismatch", ["A source describes it as sleeveless, but it's a shirt."]);
    await saveReviewFlags(pool, own.storeId, own.productId, "contradiction", []);
    expect(await getReviewFlags(pool, own.storeId, own.productId)).toEqual([
      { kind: "mismatch", message: "A source describes it as sleeveless, but it's a shirt." },
    ]);
  });

  it("won't flag another store's product", async () => {
    await saveReviewFlags(pool, own.storeId, other.productId, "contradiction", ["x"]);
    expect(await getReviewFlags(pool, other.storeId, other.productId)).toEqual([]);
  });
});
