// PRD v4 §7 Step 15l: spec values per product, with sources (D51).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { getProductSpecs, saveResearchedSpecs, saveOwnerSpecs, setProductSpecCategory, setStoreIndustry, getSpecSetup } from "../src/product-specs.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });
const seeded: string[] = [];
async function seed(): Promise<{ storeId: string; productId: string }> {
  const { rows: [s] } = await pool.query<{ id: string }>(`insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`, [`specs-test-${randomUUID()}.myshopify.com`]);
  seeded.push(s!.id);
  const { rows: [p] } = await pool.query<{ id: string }>(`insert into products (store_id, title, product_type, status) values ($1, 'Animal Face', 'Cannabis Flower', 'active') returning id`, [s!.id]);
  return { storeId: s!.id, productId: p!.id };
}
let own: { storeId: string; productId: string };
let other: { storeId: string; productId: string };
beforeEach(async () => { own = await seed(); other = await seed(); });
afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

describe("product specs", () => {
  it("saves researched values with sources, and the owner's edits win over later research", async () => {
    await saveResearchedSpecs(pool, own.storeId, own.productId, [
      { key: "thc", value: "22%", source_url: "https://carmel.ca/animal-face", source_kind: "brand" },
      { key: "strain_type", value: "Sativa-dominant hybrid", source_url: "https://carmel.ca/animal-face", source_kind: "brand" },
    ]);
    await saveOwnerSpecs(pool, own.storeId, own.productId, { thc: "24–28%", cbd: "<1%", strain_type: "" });
    await saveResearchedSpecs(pool, own.storeId, own.productId, [
      { key: "thc", value: "20%", source_url: "https://other.example/x", source_kind: "retailer" },
      { key: "size", value: "3.5 g", source_url: "https://other.example/x", source_kind: "retailer" },
    ]);
    const specs = await getProductSpecs(pool, own.storeId, own.productId);
    expect(Object.fromEntries(specs.map((s) => [s.key, [s.value, s.source_kind]]))).toEqual({
      thc: ["24–28%", "owner"],
      cbd: ["<1%", "owner"],
      size: ["3.5 g", "retailer"],
    });
  });

  it("won't write to another store's product", async () => {
    await saveOwnerSpecs(pool, own.storeId, other.productId, { thc: "99%" });
    await saveResearchedSpecs(pool, own.storeId, other.productId, [{ key: "thc", value: "99%", source_url: null, source_kind: "other" }]);
    expect(await getProductSpecs(pool, other.storeId, other.productId)).toEqual([]);
  });
});

describe("spec setup", () => {
  it("reads the store's industry and the product's category override", async () => {
    expect(await getSpecSetup(pool, own.storeId, own.productId)).toEqual({ storeIndustry: null, override: null, productType: "Cannabis Flower", title: "Animal Face" });
    await setStoreIndustry(pool, own.storeId, "wine");
    await setProductSpecCategory(pool, own.storeId, own.productId, "general");
    await setProductSpecCategory(pool, other.storeId, own.productId, "wine");   // wrong store: ignored
    expect(await getSpecSetup(pool, own.storeId, own.productId)).toMatchObject({ storeIndustry: "wine", override: "general" });
    await setProductSpecCategory(pool, own.storeId, own.productId, null);
    expect(await getSpecSetup(pool, own.storeId, own.productId)).toMatchObject({ override: null });
  });
});
