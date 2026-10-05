// PRD v4 §7 Step 15a: questions asked through the Shelf-Side AI Assistant.
// Every question is stripped of personal details before it's stored, so no
// caller can save raw PII (docs/PRD-ai-assistant.md D10).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { recordQuestion } from "../src/product-questions.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seededStores: string[] = [];
async function seedStoreWithProduct(): Promise<{ storeId: string; productId: string }> {
  const { rows: [store] } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`questions-test-${randomUUID()}.myshopify.com`],
  );
  seededStores.push(store!.id);
  const { rows: [product] } = await pool.query<{ id: string }>(
    `insert into products (store_id, title, status) values ($1, 'Weekend chukka boot', 'active') returning id`,
    [store!.id],
  );
  return { storeId: store!.id, productId: product!.id };
}

let own: { storeId: string; productId: string };
let other: { storeId: string; productId: string };
beforeEach(async () => {
  own = await seedStoreWithProduct();
  other = await seedStoreWithProduct();
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seededStores]);
  await pool.end();
});

const base = () => ({
  storeId: own.storeId,
  productId: own.productId,
  sessionId: "sess-1",
  askedBy: "customer" as const,
  answerText: "It runs true to size.",
  sources: [{ kind: "product_details" }],
  status: "answered" as const,
});

describe("recordQuestion", () => {
  it("stores a customer question with its answer", async () => {
    const q = await recordQuestion(pool, { ...base(), questionText: "Does it run small?" });
    expect(q).toMatchObject({
      store_id: own.storeId,
      product_id: own.productId,
      asked_by: "customer",
      question_text: "Does it run small?",
      pii_removed: [],
      answer_text: "It runs true to size.",
      status: "answered",
    });
  });

  it("strips personal details before saving and records what was removed", async () => {
    const q = await recordQuestion(pool, { ...base(), questionText: "Text me at 416-555-0199 when the 10 is back" });
    expect(q!.question_text).toBe("Text me at [phone number removed] when the 10 is back");
    expect(q!.pii_removed).toEqual(["phone"]);
    const { rows } = await pool.query(`select question_text from product_questions where id = $1`, [q!.id]);
    expect(rows[0].question_text).not.toContain("555");
  });

  it("strips personal details from the stored answer too", async () => {
    const q = await recordQuestion(pool, { ...base(), questionText: "Who do I email?", answerText: "Ask sam@example.com" });
    expect(q!.answer_text).toBe("Ask [email removed]");
  });

  it("records an unanswered question with no answer", async () => {
    const q = await recordQuestion(pool, { ...base(), questionText: "Is it made in Canada?", answerText: null, status: "unanswered" });
    expect(q).toMatchObject({ status: "unanswered", answer_text: null });
  });

  it("won't record a question against another store's product", async () => {
    const q = await recordQuestion(pool, { ...base(), productId: other.productId, questionText: "Does it run small?" });
    expect(q).toBeNull();
  });

  it("only accepts a staff question with a staff member of the same store", async () => {
    const { rows: [staff] } = await pool.query<{ id: string }>(
      `insert into store_staff (store_id, email) values ($1, $2) returning id`,
      [other.storeId, `s-${randomUUID()}@example.com`],
    );
    const q = await recordQuestion(pool, { ...base(), askedBy: "staff", staffId: staff!.id, sessionId: null, questionText: "What's it made of?" });
    expect(q).toBeNull();
  });
});

describe("countRecentSessionQuestions", () => {
  it("counts this session's customer questions about the product in the recent window", async () => {
    const { countRecentSessionQuestions } = await import("../src/product-questions.js");
    for (let i = 0; i < 3; i++) await recordQuestion(pool, { ...base(), questionText: `q${i}` });
    await recordQuestion(pool, { ...base(), sessionId: "sess-2", questionText: "other session" });
    await pool.query(
      `update product_questions set created_at = now() - interval '5 hours' where question_text = 'q0' and product_id = $1`,
      [own.productId],
    );
    expect(await countRecentSessionQuestions(pool, "sess-1", own.productId, 4)).toBe(2);
  });
});

describe("getActiveAnswers", () => {
  it("returns the store's answers for this product, then store-wide ones, without retired answers or other stores'", async () => {
    const { getActiveAnswers } = await import("../src/product-questions.js");
    const add = (storeId: string, productId: string | null, question: string, retired = false) => pool.query(
      `insert into product_answers (store_id, product_id, question, answer, author_role, retired_at)
       values ($1, $2, $3, 'a', 'owner', $4)`,
      [storeId, productId, question, retired ? new Date() : null],
    );
    await add(own.storeId, null, "Return policy?");
    await add(own.storeId, own.productId, "Made in Canada?");
    await add(own.storeId, own.productId, "Old answer", true);
    await add(other.storeId, null, "Other store policy");

    const answers = await getActiveAnswers(pool, own.storeId, own.productId);
    expect(answers.map((a) => [a.question, a.product_id === null ? "store" : "product"])).toEqual([
      ["Made in Canada?", "product"],
      ["Return policy?", "store"],
    ]);
  });
});
