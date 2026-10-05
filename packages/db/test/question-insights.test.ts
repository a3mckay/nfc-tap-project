// PRD v4 §7 Step 15g: the admin Questions tab (docs/PRD-ai-assistant.md §3.C;
// D7, D8, D11, D12, D20, D38).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { recordQuestion } from "../src/product-questions.js";
import { applyThemeAssignments } from "../src/question-themes.js";
import { getActiveAnswers } from "../src/product-questions.js";
import { getEnrichmentByProductId } from "../src/enrichments.js";
import { getProductTraining } from "../src/product-training.js";
import {
  listQuestionProducts, markProductReviewed, getProductQuestionView, answerQuestions, dismissQuestion,
  addAnswerToFaq, addAnswerToTraining, retireAnswer,
} from "../src/question-insights.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seeded: string[] = [];
async function seedStore(): Promise<{ storeId: string; boot: string; loafer: string }> {
  const { rows: [store] } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`insights-test-${randomUUID()}.myshopify.com`],
  );
  seeded.push(store!.id);
  const add = async (title: string) => (await pool.query<{ id: string }>(
    `insert into products (store_id, title, status) values ($1, $2, 'active') returning id`, [store!.id, title])).rows[0]!.id;
  return { storeId: store!.id, boot: await add("Weekend Chukka"), loafer: await add("Penny Loafer") };
}

let s: Awaited<ReturnType<typeof seedStore>>;
let other: Awaited<ReturnType<typeof seedStore>>;
beforeEach(async () => {
  s = await seedStore();
  other = await seedStore();
});
afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

const ask = (productId: string, text: string, status: "answered" | "unanswered" = "answered", storeId = s.storeId) =>
  recordQuestion(pool, { storeId, productId, sessionId: "sess", askedBy: "customer", questionText: text, answerText: status === "answered" ? "An answer" : null, sources: [], status });

describe("listQuestionProducts", () => {
  it("lists products that have questions, with totals, new, unanswered, top theme and last asked; new or unanswered first", async () => {
    const q1 = await ask(s.boot, "Does it run small?");
    await ask(s.boot, "Should I size up?");
    await ask(s.boot, "Made in Canada?", "unanswered");
    await ask(s.loafer, "Is it leather?");
    await markProductReviewed(pool, s.storeId, s.loafer);
    await applyThemeAssignments(pool, s.storeId, s.boot, [{ questionId: q1!.id, newTheme: { label: "Does it run small?", kind: "fit", storeTheme: "Sizing" } }]);
    await ask(s.boot, "Other store", "answered", other.storeId).catch(() => null);

    const rows = await listQuestionProducts(pool, s.storeId);
    expect(rows.map((r) => [r.title, r.total, r.new_count, r.unanswered, r.top_theme])).toEqual([
      ["Weekend Chukka", 3, 3, 1, "Does it run small?"],
      ["Penny Loafer", 1, 0, 0, null],
    ]);
    expect(rows[0]!.last_asked).toBeInstanceOf(Date);
  });
});

describe("getProductQuestionView", () => {
  it("groups questions by theme, with counts and the latest answer, and lists them verbatim", async () => {
    const a = await ask(s.boot, "Does it run small?");
    const b = await ask(s.boot, "Should I size up?");
    const c = await recordQuestion(pool, { storeId: s.storeId, productId: s.boot, sessionId: "x", askedBy: "customer", questionText: "Text me 416-555-0199", answerText: null, sources: [], status: "unanswered" });
    await applyThemeAssignments(pool, s.storeId, s.boot, [
      { questionId: a!.id, newTheme: { label: "Does it run small?", kind: "fit", storeTheme: "Sizing" } },
    ]);
    const themeId = (await pool.query(`select theme_id from product_questions where id = $1`, [a!.id])).rows[0].theme_id;
    await applyThemeAssignments(pool, s.storeId, s.boot, [{ questionId: b!.id, themeId }]);

    const view = await getProductQuestionView(pool, s.storeId, s.boot);
    expect(view!.product.title).toBe("Weekend Chukka");
    expect(view!.themes).toEqual([
      expect.objectContaining({ id: themeId, label: "Does it run small?", store_theme: "Sizing", count: 2, unanswered: 0, latest_answer: "An answer" }),
      expect.objectContaining({ id: null, label: "Not grouped yet", count: 1, unanswered: 1 }),
    ]);
    expect(view!.questions.map((q) => q.question_text)).toEqual(["Text me [phone number removed]", "Should I size up?", "Does it run small?"]);
    expect(view!.questions[0]).toMatchObject({ pii_removed: ["phone"], status: "unanswered", asked_by: "customer", theme_label: null });
  });

  it("is empty for another store's product", async () => {
    await ask(s.boot, "Does it run small?");
    expect(await getProductQuestionView(pool, other.storeId, s.boot)).toBeNull();
  });
});

describe("answering", () => {
  it("adds the answer to the hidden pool and marks the theme's unanswered questions as answered by the team (D12, D38)", async () => {
    const q = await ask(s.boot, "Made in Canada?", "unanswered");
    await applyThemeAssignments(pool, s.storeId, s.boot, [{ questionId: q!.id, newTheme: { label: "Where is it made?", kind: "origin", storeTheme: "Origin" } }]);
    const themeId = (await pool.query(`select theme_id from product_questions where id = $1`, [q!.id])).rows[0].theme_id;

    const answer = await answerQuestions(pool, s.storeId, s.boot, { themeId, questionId: null, question: "Where is it made?", answer: "In Portugal.", author: { role: "manager", staffId: null } });
    expect(answer).toMatchObject({ question: "Where is it made?", answer: "In Portugal." });
    expect((await getActiveAnswers(pool, s.storeId, s.boot)).map((a) => a.answer)).toEqual(["In Portugal."]);
    const { rows } = await pool.query(`select status from product_questions where id = $1`, [q!.id]);
    expect(rows[0].status).toBe("staff_answered");
  });

  it("answers a single ungrouped question, and won't answer another store's", async () => {
    const q = await ask(s.boot, "Is it resoleable?", "unanswered");
    expect(await answerQuestions(pool, other.storeId, s.boot, { themeId: null, questionId: q!.id, question: "x", answer: "y", author: { role: "owner", staffId: null } })).toBeNull();
    expect(await answerQuestions(pool, s.storeId, s.boot, { themeId: null, questionId: q!.id, question: "Is it resoleable?", answer: "Yes.", author: { role: "owner", staffId: null } })).not.toBeNull();
    expect((await pool.query(`select status from product_questions where id = $1`, [q!.id])).rows[0].status).toBe("staff_answered");
  });

  it("dismisses a question, and retires an answer from the pool", async () => {
    const q = await ask(s.boot, "asdfgh", "unanswered");
    expect(await dismissQuestion(pool, other.storeId, q!.id)).toBe(false);
    expect(await dismissQuestion(pool, s.storeId, q!.id)).toBe(true);
    const a = await answerQuestions(pool, s.storeId, s.boot, { themeId: null, questionId: null, question: "Q", answer: "A", author: { role: "owner", staffId: null } });
    expect(await retireAnswer(pool, other.storeId, a!.id)).toBe(false);
    expect(await retireAnswer(pool, s.storeId, a!.id)).toBe(true);
    expect(await getActiveAnswers(pool, s.storeId, s.boot)).toEqual([]);
  });
});

describe("promoting an answer", () => {
  it("adds it to the visible FAQ or the training Q&A only when asked (D12)", async () => {
    expect(await addAnswerToFaq(pool, s.storeId, s.boot, "Where is it made?", "In Portugal.")).toBe(true);
    expect((await getEnrichmentByProductId(pool, s.boot))?.faq).toEqual([{ question: "Where is it made?", answer: "In Portugal." }]);
    expect(await addAnswerToTraining(pool, s.storeId, s.boot, "Where is it made?", "In Portugal.")).toBe(true);
    expect((await getProductTraining(pool, s.boot, s.storeId))?.common_questions).toEqual([{ question: "Where is it made?", answer: "In Portugal." }]);
    expect(await addAnswerToFaq(pool, other.storeId, s.boot, "x", "y")).toBe(false);
  });
});
