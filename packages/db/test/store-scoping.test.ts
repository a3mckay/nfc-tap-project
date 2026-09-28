// ID-keyed admin writes must be scoped to the acting store (PRD v4 §12):
// a store admin who knows another store's row ID must not be able to change it.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { assignTagToProduct, setTagStatus } from "../src/tags.js";
import { setReviewStatus } from "../src/reviews.js";
import { setAwardStatus } from "../src/awards.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

interface Fixture {
  storeId: string;
  productId: string;
  tagId: string;
  reviewId: string;
  awardId: string;
}

async function seedStore(): Promise<Fixture> {
  const q = async (sql: string, params: unknown[]) =>
    (await pool.query<{ id: string }>(sql, params)).rows[0]!.id;

  const storeId = await q(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`scope-test-${randomUUID()}.myshopify.com`],
  );
  const productId = await q(
    `insert into products (store_id, title, status) values ($1, 'Test product', 'active') returning id`,
    [storeId],
  );
  const tagId = await q(
    `insert into tags (store_id, tag_uuid, status, tag_number) values ($1, $2, 'unassigned', 1) returning id`,
    [storeId, randomUUID()],
  );
  const reviewId = await q(
    `insert into external_reviews (store_id, product_id, provider, body, status)
     values ($1, $2, 'manual', 'Great', 'pending') returning id`,
    [storeId, productId],
  );
  const awardId = await q(
    `insert into awards (store_id, product_id, title, status)
     values ($1, $2, 'Best of 2026', 'pending') returning id`,
    [storeId, productId],
  );
  return { storeId, productId, tagId, reviewId, awardId };
}

async function tagRow(id: string) {
  const { rows } = await pool.query<{ product_id: string | null; status: string }>(
    `select product_id, status from tags where id = $1`,
    [id],
  );
  return rows[0]!;
}

async function statusOf(table: "external_reviews" | "awards", id: string) {
  const { rows } = await pool.query<{ status: string }>(`select status from ${table} where id = $1`, [id]);
  return rows[0]!.status;
}

let own: Fixture;
let other: Fixture;
const seededStores: string[] = [];

beforeEach(async () => {
  own = await seedStore();
  other = await seedStore();
  seededStores.push(own.storeId, other.storeId);
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seededStores]);
  await pool.end();
});

describe("assignTagToProduct", () => {
  it("assigns the store's own tag to the store's own product", async () => {
    expect(await assignTagToProduct(pool, own.tagId, own.storeId, own.productId)).toBe(true);
    expect(await tagRow(own.tagId)).toEqual({ product_id: own.productId, status: "active" });
  });

  it("unassigns the store's own tag", async () => {
    await assignTagToProduct(pool, own.tagId, own.storeId, own.productId);
    expect(await assignTagToProduct(pool, own.tagId, own.storeId, null)).toBe(true);
    expect(await tagRow(own.tagId)).toEqual({ product_id: null, status: "unassigned" });
  });

  it("does not touch another store's tag", async () => {
    expect(await assignTagToProduct(pool, other.tagId, own.storeId, own.productId)).toBe(false);
    expect(await tagRow(other.tagId)).toEqual({ product_id: null, status: "unassigned" });
  });

  it("does not assign the store's tag to another store's product", async () => {
    expect(await assignTagToProduct(pool, own.tagId, own.storeId, other.productId)).toBe(false);
    expect(await tagRow(own.tagId)).toEqual({ product_id: null, status: "unassigned" });
  });
});

describe("setTagStatus", () => {
  it("updates the store's own tag", async () => {
    expect(await setTagStatus(pool, own.tagId, own.storeId, "disabled")).toBe(true);
    expect((await tagRow(own.tagId)).status).toBe("disabled");
  });

  it("does not touch another store's tag", async () => {
    expect(await setTagStatus(pool, other.tagId, own.storeId, "disabled")).toBe(false);
    expect((await tagRow(other.tagId)).status).toBe("unassigned");
  });
});

describe("setReviewStatus", () => {
  it("updates the store's own review", async () => {
    await setReviewStatus(pool, own.reviewId, own.storeId, "approved");
    expect(await statusOf("external_reviews", own.reviewId)).toBe("approved");
  });

  it("does not touch another store's review", async () => {
    await setReviewStatus(pool, other.reviewId, own.storeId, "approved");
    expect(await statusOf("external_reviews", other.reviewId)).toBe("pending");
  });
});

describe("setAwardStatus", () => {
  it("updates the store's own award", async () => {
    await setAwardStatus(pool, own.awardId, own.storeId, "approved");
    expect(await statusOf("awards", own.awardId)).toBe("approved");
  });

  it("does not touch another store's award", async () => {
    await setAwardStatus(pool, other.awardId, own.storeId, "approved");
    expect(await statusOf("awards", other.awardId)).toBe("pending");
  });
});
