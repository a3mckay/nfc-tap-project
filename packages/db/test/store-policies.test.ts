// PRD v4 §7 Step 15j: store policies that owners and managers write and the AI
// assistant answers from (docs/PRD-ai-assistant.md D48).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { getStorePolicies, saveStorePolicies, POLICY_TYPES } from "../src/store-policies.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seeded: string[] = [];
async function seedStore(): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`policies-test-${randomUUID()}.myshopify.com`],
  );
  seeded.push(rows[0]!.id);
  return rows[0]!.id;
}

let own: string;
let other: string;
beforeEach(async () => {
  own = await seedStore();
  other = await seedStore();
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

describe("store policies", () => {
  it("lists the policy types customers ask about most, each with a label", () => {
    expect(POLICY_TYPES.map((p) => p.key)).toEqual([
      "returns", "warranty", "alterations", "price_match", "holds", "delivery", "gifts", "id_age",
    ]);
    expect(POLICY_TYPES.every((p) => p.label && p.hint)).toBe(true);
  });

  it("saves, trims and returns only the filled-in policies, in the standard order", async () => {
    await saveStorePolicies(pool, own, { delivery: " Free local delivery over $100. ", returns: "30 days, unworn, with tags.", warranty: "   " });
    expect(await getStorePolicies(pool, own)).toEqual([
      { key: "returns", label: "Returns and exchanges", text: "30 days, unworn, with tags." },
      { key: "delivery", label: "Delivery and shipping", text: "Free local delivery over $100." },
    ]);
  });

  it("clears a policy saved as blank, and ignores unknown keys", async () => {
    await saveStorePolicies(pool, own, { returns: "30 days." });
    await saveStorePolicies(pool, own, { returns: "", nonsense: "x" } as Record<string, string>);
    expect(await getStorePolicies(pool, own)).toEqual([]);
  });

  it("keeps each store's policies separate", async () => {
    await saveStorePolicies(pool, own, { returns: "30 days." });
    expect(await getStorePolicies(pool, other)).toEqual([]);
  });
});
