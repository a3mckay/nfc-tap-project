// "Goes great with" (founder, 2026-11-16): up to three of the store's own
// products that a product needs or suits, each with a sourced reason. The AI
// picks them; the owner can remove one, and a removed pairing stays removed.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { replacePairings, getPairings, removePairing, getPairingCatalog, MAX_PAIRINGS } from "../src/product-pairings.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seeded: string[] = [];
async function seedStore(): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token, industry) values ($1, 'x', 'plants') returning id`,
    [`pairings-test-${randomUUID()}.myshopify.com`],
  );
  seeded.push(rows[0]!.id);
  return rows[0]!.id;
}
async function seedProduct(storeId: string, title: string, extra: { status?: string; deleted?: boolean; tag?: boolean; type?: string; description?: string } = {}): Promise<string> {
  const { rows: [p] } = await pool.query<{ id: string }>(
    `insert into products (store_id, title, product_type, description_html, status, deleted_at, images)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [storeId, title, extra.type ?? null, extra.description ?? null, extra.status ?? "active", extra.deleted ? new Date() : null,
      JSON.stringify([{ url: `https://img.example/${encodeURIComponent(title)}.jpg`, altText: title }])],
  );
  if (extra.tag) {
    await pool.query(
      `insert into tags (store_id, product_id, status, tag_uuid, tag_number)
       values ($1, $2, 'active', gen_random_uuid(), (select coalesce(max(tag_number), 0) + 1 from tags where store_id = $1))`,
      [storeId, p!.id],
    );
  }
  return p!.id;
}

let store: string;
let plant: string, soap: string, meter: string, food: string;
beforeEach(async () => {
  store = await seedStore();
  plant = await seedProduct(store, "Bromeliad Ocean Mist", { tag: true });
  soap = await seedProduct(store, "Insecticidal Soap", { tag: true, type: "Pest control", description: "<p>Ready-to-use insecticidal soap spray.</p>" });
  meter = await seedProduct(store, "Moisture Tester");   // no tag: shown, but not linked
  food = await seedProduct(store, "Tropical Plant Food", { tag: true });
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

const pairing = (paired: string, reason = "Bromeliads can get mealybugs", source_url: string | null = "https://plants.ces.ncsu.edu/x/") =>
  ({ paired_product_id: paired, reason, source_url, source_kind: "reference" as const });

describe("product pairings", () => {
  it("saves pairings with their reasons and sources, and lists them with each product's photo and tag", async () => {
    await replacePairings(pool, store, plant, [pairing(soap), pairing(meter, "Water when the top of the soil dries")]);
    expect(await getPairings(pool, store, plant)).toEqual([
      expect.objectContaining({ product_id: soap, title: "Insecticidal Soap", reason: "Bromeliads can get mealybugs", source_url: "https://plants.ces.ncsu.edu/x/", source_kind: "reference", image_url: "https://img.example/Insecticidal%20Soap.jpg", tag_uuid: expect.any(String) }),
      expect.objectContaining({ product_id: meter, title: "Moisture Tester", tag_uuid: null }),
    ]);
  });

  it("keeps at most three, never the product itself, and only the store's own live products", async () => {
    const other = await seedStore();
    const elsewhere = await seedProduct(other, "Someone else's soap");
    const draft = await seedProduct(store, "Draft product", { status: "draft" });
    const gone = await seedProduct(store, "Deleted product", { deleted: true });
    const extra = await seedProduct(store, "Pebble tray");
    await replacePairings(pool, store, plant, [pairing(plant), pairing(elsewhere), pairing(draft), pairing(gone), pairing(soap), pairing(meter), pairing(food), pairing(extra)]);
    expect((await getPairings(pool, store, plant)).map((p) => p.product_id)).toEqual([soap, meter, food]);
    expect(MAX_PAIRINGS).toBe(3);
  });

  it("replaces the AI's pairings on a new run, but a pairing the owner removed stays removed", async () => {
    await replacePairings(pool, store, plant, [pairing(soap), pairing(meter)]);
    expect(await removePairing(pool, store, plant, soap)).toBe(true);
    await replacePairings(pool, store, plant, [pairing(soap), pairing(food)]);
    expect((await getPairings(pool, store, plant)).map((p) => p.product_id)).toEqual([food]);
  });

  it("won't let another store remove or read a pairing", async () => {
    await replacePairings(pool, store, plant, [pairing(soap)]);
    const other = await seedStore();
    expect(await removePairing(pool, other, plant, soap)).toBe(false);
    expect(await getPairings(pool, other, plant)).toEqual([]);
  });

  it("lists the store's other live products as candidates, with their category and a short description", async () => {
    const catalog = await getPairingCatalog(pool, store, plant);
    expect(catalog.map((c) => c.title).sort()).toEqual(["Insecticidal Soap", "Moisture Tester", "Tropical Plant Food"]);
    expect(catalog.find((c) => c.id === soap)).toMatchObject({ product_type: "Pest control", description: "Ready-to-use insecticidal soap spray.", category: "garden_care" });
  });
});
