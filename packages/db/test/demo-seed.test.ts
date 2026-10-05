// PRD v4 §7 Phase 4: the demo kit seed (packages/db/seeds/demo.ts).
import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { DEMO_PRODUCTS, seedDemo } from "../seeds/demo.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

// A unique shop domain keeps the test away from a real local demo store.
const shopDomain = `demo-seed-test-${randomUUID()}.myshopify.com`;

afterAll(async () => {
  // tap_events.tag_id is ON DELETE RESTRICT, so clear taps before the store cascade.
  await pool.query(
    `delete from tap_events where store_id in (select id from stores where shopify_shop_domain = $1)`,
    [shopDomain],
  );
  await pool.query(`delete from stores where shopify_shop_domain = $1`, [shopDomain]);
  await pool.end();
});

async function snapshot(storeId: string) {
  const { rows: tags } = await pool.query<{ id: string; tag_number: string; product_id: string; status: string }>(
    `select id, tag_number, product_id, status from tags where store_id = $1 order by tag_number`,
    [storeId],
  );
  const { rows: [counts] } = await pool.query<{ products: string; enrichments: string; taps: string }>(
    `select (select count(*) from products where store_id = $1) as products,
            (select count(*) from enrichments e join products p on p.id = e.product_id
              where p.store_id = $1) as enrichments,
            (select count(*) from tap_events where store_id = $1) as taps`,
    [storeId],
  );
  return { tags, counts: counts! };
}

describe("seedDemo", () => {
  let storeId: string;

  it("creates every demo product with an enrichment and one numbered active tag", async () => {
    storeId = (await seedDemo(pool, shopDomain)).storeId;
    const { tags, counts } = await snapshot(storeId);

    expect(Number(counts.products)).toBe(DEMO_PRODUCTS.length);
    expect(Number(counts.enrichments)).toBe(DEMO_PRODUCTS.length);
    expect(Number(counts.taps)).toBeGreaterThan(0);
    expect(tags.map((t) => Number(t.tag_number))).toEqual([1, 2, 3]);
    expect(tags.every((t) => t.status === "active" && t.product_id)).toBe(true);
    expect(new Set(tags.map((t) => t.product_id)).size).toBe(DEMO_PRODUCTS.length);
  });

  it("is idempotent: a re-run adds no products, tags or tap events", async () => {
    const before = await snapshot(storeId);
    const again = await seedDemo(pool, shopDomain);
    expect(again.storeId).toBe(storeId);
    expect(await snapshot(storeId)).toEqual(before);
  });
});
