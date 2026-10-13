// PRD v4 §7 Step 12: one demo store per sales prospect, from a config file
// (packages/db/seeds/prospect.ts). Owner demos only: no made-up taps.
import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { seedProspect, parseProspect, type ProspectConfig } from "../seeds/prospect.js";
import { verifyPassword, getOpenStoreClaim } from "../src/index.js";
import { createHash } from "crypto";

const connectionString = process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const slug = `prospect-test-${randomUUID().slice(0, 8)}`;
const email = `${slug}@example.com`;
const config: ProspectConfig = {
  slug,
  name: "Miller's Shoes",
  industry: "footwear",
  theme: { primaryColor: "#1f3a5f", logoUrl: "https://example.com/logo.png" },
  owner: { email },
  products: [
    { title: "Wide Walker", vendor: "New Balance", productType: "Shoes", price: "189.00", imageUrl: "https://example.com/a.jpg", description: "A wide-fit walking shoe." },
    { title: "Chelsea Boot", vendor: "Blundstone", productType: "Boots", price: "249.00" },
  ],
};

afterAll(async () => {
  await pool.query(`delete from stores where shopify_shop_domain = $1`, [`${slug}.prospect.tapshelf.co`]);
  await pool.query(`delete from store_admins where email = $1`, [email]);
  await pool.end();
});

describe("parseProspect", () => {
  it("accepts a valid config", () => {
    expect(parseProspect(config)).toEqual(config);
  });

  it("names what's wrong with an invalid one", () => {
    expect(() => parseProspect({ ...config, slug: "Bad Slug!" })).toThrow(/slug/);
    expect(() => parseProspect({ ...config, industry: "toasters" })).toThrow(/industry/);
    expect(() => parseProspect({ ...config, products: [] })).toThrow(/product/);
    expect(() => parseProspect({ ...config, products: [{ title: "" }] })).toThrow(/title/);
  });
});

describe("seedProspect", () => {
  let first: Awaited<ReturnType<typeof seedProspect>>;

  it("creates the store with its name, category and theme, one active tag per product, and an owner login", async () => {
    first = await seedProspect(pool, config, "https://tapshelf.store");

    const { rows: [store] } = await pool.query(`select * from stores where id = $1`, [first.storeId]);
    expect(store.shopify_shop_domain).toBe(`${slug}.prospect.tapshelf.co`);
    expect(store.name).toBe("Miller's Shoes");
    expect(store.industry).toBe("footwear");
    expect(store.theme_settings).toMatchObject({ primaryColor: "#1f3a5f", logoUrl: "https://example.com/logo.png" });

    expect(first.tags.map((t) => t.title)).toEqual(["Wide Walker", "Chelsea Boot"]);
    expect(first.tags.every((t) => /^https:\/\/tapshelf\.store\/p\/[0-9a-f-]{36}$/.test(t.url))).toBe(true);
    const { rows: tags } = await pool.query(`select status, product_id from tags where store_id = $1`, [first.storeId]);
    expect(tags.every((t) => t.status === "active" && t.product_id)).toBe(true);

    const { rows: [product] } = await pool.query(`select * from products where store_id = $1 and title = 'Wide Walker'`, [first.storeId]);
    expect(product.images).toEqual([{ url: "https://example.com/a.jpg", altText: "Wide Walker" }]);
    expect(product.variants[0].price).toBe("189.00");

    expect(first.owner).toMatchObject({ email, created: true });
    const { rows: [admin] } = await pool.query(`select password_hash from store_admins where email = $1`, [email]);
    expect(await verifyPassword(first.owner!.password!, admin.password_hash)).toBe(true);
  });

  it("adds no made-up taps (owners see only real ones)", async () => {
    const { rows: [n] } = await pool.query(`select count(*)::int as c from tap_events where store_id = $1`, [first.storeId]);
    expect(n.c).toBe(0);
  });

  it("is safe to re-run: tags (already written to cards) and the owner's password stay the same", async () => {
    const again = await seedProspect(pool, { ...config, products: [{ ...config.products[0]!, price: "199.00" }, config.products[1]!] }, "https://tapshelf.store");
    expect(again.storeId).toBe(first.storeId);
    expect(again.tags.map((t) => t.url)).toEqual(first.tags.map((t) => t.url));
    expect(again.owner).toEqual({ email, created: false });
    const { rows: [product] } = await pool.query(`select variants from products where store_id = $1 and title = 'Wide Walker'`, [first.storeId]);
    expect(product.variants[0].price).toBe("199.00");
  });
});

const urlOf = (r: Awaited<ReturnType<typeof seedProspect>>) => (r.claim?.status === "created" ? r.claim.url : undefined);

describe("seedProspect without an owner email (claim links)", () => {
  const claimSlug = `prospect-claim-${randomUUID().slice(0, 8)}`;
  const claimConfig: ProspectConfig = { slug: claimSlug, name: "DSW", industry: "footwear", products: [{ title: "Court Vision Low" }] };
  const opts = { adminBaseUrl: "https://admin.tapshelf.co" };
  let firstUrl: string;

  afterAll(async () => {
    await pool.query(`delete from stores where shopify_shop_domain = $1`, [`${claimSlug}.prospect.tapshelf.co`]);
  });

  it("creates a one-time claim link for the kit, valid for 90 days", async () => {
    const result = await seedProspect(pool, claimConfig, "https://tapshelf.store", opts);
    expect(result.owner).toBeNull();
    expect(result.claim).toMatchObject({ status: "created" });
    firstUrl = urlOf(result)!;
    expect(firstUrl).toMatch(/^https:\/\/admin\.tapshelf\.co\/login\/claim\?token=[A-Za-z0-9_-]{43}$/);
    const token = new URL(firstUrl).searchParams.get("token")!;
    const open = await getOpenStoreClaim(pool, createHash("sha256").update(token).digest("base64url"));
    expect(open?.store_id).toBe(result.storeId);
    const { rows: [c] } = await pool.query(`select expires_at - created_at > interval '89 days' as long from store_claims where store_id = $1`, [result.storeId]);
    expect(c.long).toBe(true);
  });

  it("keeps the same link on a re-run, and issues a new one (replacing it) only when asked", async () => {
    expect((await seedProspect(pool, claimConfig, "https://tapshelf.store", opts)).claim).toEqual({ status: "open" });
    const renewed = await seedProspect(pool, claimConfig, "https://tapshelf.store", { ...opts, newClaim: true });
    expect(renewed.claim?.status).toBe("created");
    expect(urlOf(renewed)).not.toBe(firstUrl);
    const old = new URL(firstUrl).searchParams.get("token")!;
    expect(await getOpenStoreClaim(pool, createHash("sha256").update(old).digest("base64url"))).toBeNull();
  });

  it("makes no link once the store has an owner", async () => {
    const { rows: [s] } = await pool.query(`select id from stores where shopify_shop_domain = $1`, [`${claimSlug}.prospect.tapshelf.co`]);
    await pool.query(`insert into store_admins (store_id, email, password_hash) values ($1, $2, 'x')`, [s.id, `${claimSlug}@example.com`]);
    expect((await seedProspect(pool, claimConfig, "https://tapshelf.store", { ...opts, newClaim: true })).claim).toEqual({ status: "claimed" });
    await pool.query(`delete from store_admins where email = $1`, [`${claimSlug}@example.com`]);
  });
});
