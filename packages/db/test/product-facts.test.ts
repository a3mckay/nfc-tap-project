// PRD v4 §7 Step 15b: the research fact sheet (docs/PRD-ai-assistant.md §6.2,
// D42). Facts found by the AI research tool, each with its source. Owners and
// managers can edit them, and their edits survive regeneration.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  getProductFacts,
  replaceResearchedFacts,
  updateFact,
  addOwnerFact,
  deleteFact,
  getBrandWebsite,
  setBrandWebsite,
} from "../src/product-facts.js";
import { upsertFullEnrichment, getEnrichmentByProductId } from "../src/enrichments.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seededStores: string[] = [];
async function seed(): Promise<{ storeId: string; productId: string }> {
  const { rows: [store] } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`facts-test-${randomUUID()}.myshopify.com`],
  );
  seededStores.push(store!.id);
  const { rows: [product] } = await pool.query<{ id: string }>(
    `insert into products (store_id, title, vendor, status) values ($1, 'Weekend chukka boot', 'Northfield', 'active') returning id`,
    [store!.id],
  );
  return { storeId: store!.id, productId: product!.id };
}

let own: { storeId: string; productId: string };
let other: { storeId: string; productId: string };
beforeEach(async () => {
  own = await seed();
  other = await seed();
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seededStores]);
  await pool.query(`delete from brands where slug like 'facts-test-%'`);
  await pool.end();
});

const researched = [
  { topic: "materials", fact: "Full-grain suede upper", source_url: "https://northfield.com/chukka", source_kind: "brand" as const },
  { topic: "care", fact: "Brush when dry; use suede protector", source_url: "https://retailer.com/p/1", source_kind: "retailer" as const },
];

describe("replaceResearchedFacts / getProductFacts", () => {
  it("saves researched facts with their sources, brand facts first", async () => {
    expect(await replaceResearchedFacts(pool, own.storeId, own.productId, [...researched].reverse())).toBe(true);
    const facts = await getProductFacts(pool, own.storeId, own.productId);
    expect(facts.map((f) => [f.source_kind, f.fact])).toEqual([
      ["brand", "Full-grain suede upper"],
      ["retailer", "Brush when dry; use suede protector"],
    ]);
    expect(facts[0]).toMatchObject({ topic: "materials", source_url: "https://northfield.com/chukka", owner_edited: false });
  });

  it("replaces researched facts on regenerate but keeps facts the owner edited or added", async () => {
    await replaceResearchedFacts(pool, own.storeId, own.productId, researched);
    const [first] = await getProductFacts(pool, own.storeId, own.productId);
    await updateFact(pool, own.storeId, first!.id, { topic: "materials", fact: "Italian full-grain suede upper" });
    await addOwnerFact(pool, own.storeId, own.productId, { topic: "fit", fact: "Runs half a size large" });

    await replaceResearchedFacts(pool, own.storeId, own.productId, [
      { topic: "origin", fact: "Made in Portugal", source_url: "https://northfield.com/about", source_kind: "brand" },
    ]);
    const facts = (await getProductFacts(pool, own.storeId, own.productId)).map((f) => f.fact).sort();
    expect(facts).toEqual(["Italian full-grain suede upper", "Made in Portugal", "Runs half a size large"]);
  });

  it("won't touch another store's product", async () => {
    expect(await replaceResearchedFacts(pool, own.storeId, other.productId, researched)).toBe(false);
    expect(await getProductFacts(pool, own.storeId, other.productId)).toEqual([]);
    expect(await addOwnerFact(pool, own.storeId, other.productId, { topic: "fit", fact: "x" })).toBe(false);
  });
});

describe("owner edits", () => {
  it("marks an edited fact as the owner's, and scopes edits and deletes to the store", async () => {
    await replaceResearchedFacts(pool, own.storeId, own.productId, researched);
    const [fact] = await getProductFacts(pool, own.storeId, own.productId);

    expect(await updateFact(pool, other.storeId, fact!.id, { topic: "care", fact: "hijack" })).toBe(false);
    expect(await deleteFact(pool, other.storeId, fact!.id)).toBe(false);

    expect(await updateFact(pool, own.storeId, fact!.id, { topic: "care", fact: "Brush gently" })).toBe(true);
    const [edited] = (await getProductFacts(pool, own.storeId, own.productId)).filter((f) => f.id === fact!.id);
    expect(edited).toMatchObject({ topic: "care", fact: "Brush gently", owner_edited: true, source_url: "https://northfield.com/chukka" });

    expect(await deleteFact(pool, own.storeId, fact!.id)).toBe(true);
    expect((await getProductFacts(pool, own.storeId, own.productId)).some((f) => f.id === fact!.id)).toBe(false);
  });

  it("adds an owner's own fact with no web source", async () => {
    expect(await addOwnerFact(pool, own.storeId, own.productId, { topic: "fit", fact: "Runs half a size large" })).toBe(true);
    const [f] = await getProductFacts(pool, own.storeId, own.productId);
    expect(f).toMatchObject({ source_kind: "owner", source_url: null, owner_edited: true });
  });
});

describe("brand websites", () => {
  it("prefers the store's own setting, then the shared brands list, else null", async () => {
    expect(await getBrandWebsite(pool, own.storeId, "Northfield")).toBeNull();

    const slug = `facts-test-${randomUUID()}`;
    const name = `Brand ${slug}`;
    await pool.query(`insert into brands (name, slug, website) values ($1, $2, 'https://www.brand-shared.com')`, [name, slug]);
    expect(await getBrandWebsite(pool, own.storeId, name.toUpperCase())).toEqual({ website: "https://www.brand-shared.com", confirmed: false });

    await setBrandWebsite(pool, own.storeId, name, "https://brand-own.com", true);
    expect(await getBrandWebsite(pool, own.storeId, name)).toEqual({ website: "https://brand-own.com", confirmed: true });
    expect(await getBrandWebsite(pool, other.storeId, name)).toEqual({ website: "https://www.brand-shared.com", confirmed: false });
  });
});

describe("enrichments.great_when", () => {
  it("saves up to three key points", async () => {
    await upsertFullEnrichment(pool, {
      product_id: own.productId, backstory: null, fit_notes: null, materials: null, care_instructions: null,
      sustainability_notes: null, reasons_to_buy: [], staff_quote: null, staff_name: null, staff_photo_url: null,
      video_url: null, extra_images: [], reviews: [], awards: [], faq: [], internal_staff_notes: null,
      great_when: ["you want one boot from office to bar", "it's wet but not snowing"],
    });
    expect((await getEnrichmentByProductId(pool, own.productId))?.great_when).toEqual([
      "you want one boot from office to bar", "it's wet but not snowing",
    ]);
  });
});
