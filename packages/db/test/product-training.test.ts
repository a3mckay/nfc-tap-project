// PRD v4 §7 Step 13e: staff training notes, one row per product, store-scoped.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { getProductTraining, saveProductTraining, type ProductTrainingInput } from "../src/product-training.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seededStores: string[] = [];
async function seed(): Promise<{ storeId: string; productId: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`training-test-${randomUUID()}.myshopify.com`],
  );
  const storeId = rows[0]!.id;
  seededStores.push(storeId);
  const p = await pool.query<{ id: string }>(
    `insert into products (store_id, title, status) values ($1, 'Trail Runner', 'active') returning id`,
    [storeId],
  );
  return { storeId, productId: p.rows[0]!.id };
}

const empty: ProductTrainingInput = {
  one_line_sell: null, who_its_for: null, who_its_not_for: null, fit_and_sizing: null,
  worth_the_price: [], closest_alternative: null, common_questions: [],
  companion_products: null, brand_context: null, stock_note: null,
};

let own: { storeId: string; productId: string };
let other: { storeId: string; productId: string };
beforeEach(async () => {
  own = await seed();
  other = await seed();
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seededStores]);
  await pool.end();
});

describe("product training notes", () => {
  it("returns null before anything is saved", async () => {
    expect(await getProductTraining(pool, own.productId, own.storeId)).toBeNull();
  });

  it("saves and reads back every field", async () => {
    const input: ProductTrainingInput = {
      one_line_sell: "The one pair that does everything.",
      who_its_for: "Commuters, people who run hot",
      who_its_not_for: "Wide feet",
      fit_and_sizing: "Runs half a size small.",
      worth_the_price: ["Cushion lasts years", "Leather ages well"],
      closest_alternative: "Like the Road Runner but warmer",
      common_questions: [{ question: "Does it crease?", answer: "Yes, that's normal." }],
      companion_products: "Merino socks",
      brand_context: "Family-run since 1952.",
      stock_note: "Size 9 is display only",
    };
    expect(await saveProductTraining(pool, own.storeId, own.productId, input)).toBe(true);
    const saved = await getProductTraining(pool, own.productId, own.storeId);
    expect(saved).toMatchObject(input);
    expect(saved?.stock_note_updated_at).toBeInstanceOf(Date);
  });

  it("overwrites on a second save and clears fields set to empty", async () => {
    await saveProductTraining(pool, own.storeId, own.productId, { ...empty, one_line_sell: "First", stock_note: "Low on 9s" });
    await saveProductTraining(pool, own.storeId, own.productId, { ...empty, one_line_sell: "Second" });
    const saved = await getProductTraining(pool, own.productId, own.storeId);
    expect(saved?.one_line_sell).toBe("Second");
    expect(saved?.stock_note).toBeNull();
    expect(saved?.stock_note_updated_at).toBeNull();
  });

  it("only moves the stock-note date when the stock note changes", async () => {
    await saveProductTraining(pool, own.storeId, own.productId, { ...empty, stock_note: "Low on 9s" });
    await pool.query(`update product_training set stock_note_updated_at = '2026-01-01' where product_id = $1`, [own.productId]);
    await saveProductTraining(pool, own.storeId, own.productId, { ...empty, stock_note: "Low on 9s", one_line_sell: "New" });
    expect((await getProductTraining(pool, own.productId, own.storeId))?.stock_note_updated_at?.toISOString()).toBe(new Date("2026-01-01").toISOString());
    await saveProductTraining(pool, own.storeId, own.productId, { ...empty, stock_note: "All sizes back" });
    expect((await getProductTraining(pool, own.productId, own.storeId))?.stock_note_updated_at!.getFullYear()).toBeGreaterThan(2026 - 1);
    expect((await getProductTraining(pool, own.productId, own.storeId))?.stock_note_updated_at?.toISOString()).not.toBe(new Date("2026-01-01").toISOString());
  });

  it("won't save notes onto another store's product", async () => {
    expect(await saveProductTraining(pool, own.storeId, other.productId, { ...empty, one_line_sell: "Sneaky" })).toBe(false);
    expect(await getProductTraining(pool, other.productId, other.storeId)).toBeNull();
  });

  it("won't read another store's notes", async () => {
    await saveProductTraining(pool, other.storeId, other.productId, { ...empty, one_line_sell: "Theirs" });
    expect(await getProductTraining(pool, other.productId, own.storeId)).toBeNull();
  });
});
