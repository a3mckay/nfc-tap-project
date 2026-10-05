// PRD v4 §7 Step 15i: the admin home page's at-a-glance numbers (D44).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { recordQuestion } from "../src/product-questions.js";
import { applyThemeAssignments } from "../src/question-themes.js";
import { getHomeSummary } from "../src/home-summary.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });
const seeded: string[] = [];

let storeId: string;
let boot: string;
let loafer: string;
let tagId: string;
beforeEach(async () => {
  const { rows: [s] } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`, [`home-test-${randomUUID()}.myshopify.com`]);
  storeId = s!.id;
  seeded.push(storeId);
  const add = async (title: string) => (await pool.query<{ id: string }>(`insert into products (store_id, title, status) values ($1, $2, 'active') returning id`, [storeId, title])).rows[0]!.id;
  boot = await add("Weekend Chukka");
  loafer = await add("Penny Loafer");
  tagId = (await pool.query<{ id: string }>(`insert into tags (store_id, tag_uuid, status, tag_number) values ($1, $2, 'active', 1) returning id`, [storeId, randomUUID()])).rows[0]!.id;
});
afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

const tap = (productId: string, daysAgo: number, session = randomUUID()) => pool.query(
  `insert into tap_events (tag_id, product_id, store_id, session_id, timestamp) values ($5, $1, $2, $3, now() - ($4 || ' days')::interval)`,
  [productId, storeId, session, daysAgo, tagId]);
const ask = (productId: string, text: string, status: "answered" | "unanswered" = "answered") =>
  recordQuestion(pool, { storeId, productId, sessionId: "s", askedBy: "customer", questionText: text, answerText: status === "answered" ? "a" : null, sources: [], status });

describe("getHomeSummary", () => {
  it("counts this week's taps against last week's, and the most-tapped products", async () => {
    await tap(boot, 1); await tap(boot, 2); await tap(loafer, 3); await tap(boot, 9);
    const s = await getHomeSummary(pool, storeId);
    expect(s.taps).toEqual({ thisWeek: 3, lastWeek: 1, topProducts: [{ title: "Weekend Chukka", taps: 2 }, { title: "Penny Loafer", taps: 1 }] });
  });

  it("counts this week's customer questions, unanswered ones, the top store-wide theme and the most-asked product", async () => {
    const q1 = await ask(boot, "Does it run small?");
    const q2 = await ask(boot, "Size up?");
    await ask(loafer, "Made where?", "unanswered");
    await applyThemeAssignments(pool, storeId, boot, [
      { questionId: q1!.id, newTheme: { label: "Does it run small?", kind: "fit", storeTheme: "Sizing" } },
    ]);
    const themeId = (await pool.query(`select theme_id from product_questions where id = $1`, [q1!.id])).rows[0].theme_id;
    await applyThemeAssignments(pool, storeId, boot, [{ questionId: q2!.id, themeId }]);
    const s = await getHomeSummary(pool, storeId);
    expect(s.questions).toEqual({ thisWeek: 3, unanswered: 1, topTheme: "Sizing", mostAsked: { productId: boot, title: "Weekend Chukka", count: 2 } });
  });

  it("is all zeros for a quiet store", async () => {
    expect(await getHomeSummary(pool, storeId)).toEqual({
      taps: { thisWeek: 0, lastWeek: 0, topProducts: [] },
      questions: { thisWeek: 0, unanswered: 0, topTheme: null, mostAsked: null },
    });
  });
});
