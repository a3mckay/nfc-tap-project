// PRD v4 §7 Step 8c: delete raw taps, reactions and chat questions older than
// 24 months (PRD v4 §8; docs/PRD-ai-assistant.md D34). Promised on the
// privacy page.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { deleteExpiredRawData } from "../src/retention.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });
const seeded: string[] = [];

const OLD = "now() - interval '24 months 1 day'";
const RECENT = "now() - interval '23 months'";

let storeId: string;
let productId: string;

beforeEach(async () => {
  const { rows: [s] } = await pool.query<{ id: string }>(`insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`, [`retention-test-${randomUUID()}.myshopify.com`]);
  storeId = s!.id;
  seeded.push(storeId);
  const { rows: [p] } = await pool.query<{ id: string }>(`insert into products (store_id, title, status) values ($1, 'Weekend Chukka', 'active') returning id`, [storeId]);
  productId = p!.id;
});

afterAll(async () => {
  await pool.query(`delete from tap_events where store_id = any($1::uuid[])`, [seeded]);
  await pool.query(`delete from tags where store_id = any($1::uuid[])`, [seeded]);
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

let tagNumber = 0;

async function seedRows(age: string) {
  const { rows: [t] } = await pool.query<{ id: string }>(`insert into tags (store_id, tag_uuid, product_id, status, tag_number) values ($1, $2, $3, 'active', $4) returning id`, [storeId, randomUUID(), productId, ++tagNumber]);
  const session = randomUUID();
  await pool.query(`insert into tap_events (tag_id, product_id, store_id, session_id, timestamp) values ($1, $2, $3, $4, ${age})`, [t!.id, productId, storeId, session]);
  await pool.query(`insert into tap_reactions (tag_id, session_id, reaction, created_at) values ($1, $2, 'loved', ${age})`, [t!.id, session]);
  await pool.query(`insert into product_questions (store_id, product_id, tag_id, session_id, asked_by, question_text, status, created_at) values ($1, $2, $3, $4, 'customer', 'Does it run small?', 'unanswered', ${age})`, [storeId, productId, t!.id, session]);
}

const counts = async () => {
  const { rows: [r] } = await pool.query<{ taps: number; reactions: number; questions: number }>(
    `select (select count(*)::int from tap_events where store_id = $1) as taps,
            (select count(*)::int from tap_reactions r join tags t on t.id = r.tag_id where t.store_id = $1) as reactions,
            (select count(*)::int from product_questions where store_id = $1) as questions`,
    [storeId],
  );
  return r;
};

describe("deleteExpiredRawData", () => {
  it("deletes taps, reactions and questions older than 24 months and keeps newer ones", async () => {
    await seedRows(OLD);
    await seedRows(RECENT);

    const deleted = await deleteExpiredRawData(pool);

    expect(deleted.tap_events).toBeGreaterThanOrEqual(1);
    expect(deleted.tap_reactions).toBeGreaterThanOrEqual(1);
    expect(deleted.product_questions).toBeGreaterThanOrEqual(1);
    expect(await counts()).toEqual({ taps: 1, reactions: 1, questions: 1 });
  });

  it("does nothing when there's nothing old enough", async () => {
    await seedRows(RECENT);
    await deleteExpiredRawData(pool);
    expect(await counts()).toEqual({ taps: 1, reactions: 1, questions: 1 });
  });
});
