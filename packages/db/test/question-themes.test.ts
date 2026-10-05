// PRD v4 §7 Step 15f: grouping questions into product themes that roll up into
// store-wide themes (docs/PRD-ai-assistant.md D8, D25).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { recordQuestion } from "../src/product-questions.js";
import { getUngroupedQuestions, getThemeOptions, applyThemeAssignments } from "../src/question-themes.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seeded: string[] = [];
async function seed(): Promise<{ storeId: string; productId: string }> {
  const { rows: [store] } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`themes-test-${randomUUID()}.myshopify.com`],
  );
  seeded.push(store!.id);
  const { rows: [product] } = await pool.query<{ id: string }>(
    `insert into products (store_id, title, status) values ($1, 'Weekend chukka boot', 'active') returning id`,
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
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

const ask = (where: { storeId: string; productId: string }, text: string) =>
  recordQuestion(pool, { ...where, sessionId: "s", askedBy: "customer", questionText: text, answerText: "a", sources: [], status: "answered" });

describe("question themes", () => {
  it("lists a product's ungrouped questions, oldest first, skipping dismissed ones", async () => {
    const a = await ask(own, "Does it run small?");
    const b = await ask(own, "Is it waterproof?");
    const c = await ask(own, "Dismiss me");
    await pool.query(`update product_questions set status = 'dismissed' where id = $1`, [c!.id]);
    await ask(other, "Other store");
    expect((await getUngroupedQuestions(pool, own.storeId, own.productId, 20)).map((q) => q.id)).toEqual([a!.id, b!.id]);
  });

  it("creates product themes under store-wide themes, and reuses both", async () => {
    const q1 = await ask(own, "Does it run small?");
    const q2 = await ask(own, "Should I size up?");
    await applyThemeAssignments(pool, own.storeId, own.productId, [
      { questionId: q1!.id, newTheme: { label: "Does it run small?", kind: "fit", storeTheme: "Sizing" } },
    ]);
    let options = await getThemeOptions(pool, own.storeId, own.productId);
    expect(options.productThemes).toEqual([{ id: expect.any(String), label: "Does it run small?", kind: "fit", storeTheme: "Sizing" }]);
    expect(options.storeThemes.map((t) => t.label)).toEqual(["Sizing"]);

    await applyThemeAssignments(pool, own.storeId, own.productId, [{ questionId: q2!.id, themeId: options.productThemes[0]!.id }]);
    expect(await getUngroupedQuestions(pool, own.storeId, own.productId, 20)).toEqual([]);

    // A second product's theme joins the same store-wide theme (matched by label, case-insensitive).
    const { rows: [p2] } = await pool.query<{ id: string }>(`insert into products (store_id, title, status) values ($1, 'Loafer', 'active') returning id`, [own.storeId]);
    const q3 = await ask({ storeId: own.storeId, productId: p2!.id }, "True to size?");
    await applyThemeAssignments(pool, own.storeId, p2!.id, [{ questionId: q3!.id, newTheme: { label: "True to size?", kind: "fit", storeTheme: "sizing" } }]);
    options = await getThemeOptions(pool, own.storeId, p2!.id);
    expect(options.storeThemes.map((t) => t.label)).toEqual(["Sizing"]);
  });

  it("doesn't create a theme for questions another grouping run already grouped", async () => {
    const q = await ask(own, "Does it run small?");
    await applyThemeAssignments(pool, own.storeId, own.productId, [{ questionId: q!.id, newTheme: { label: "Does it run small?", kind: "fit", storeTheme: "Sizing" } }]);
    // A second run that classified the same question at the same time
    await applyThemeAssignments(pool, own.storeId, own.productId, [{ questionId: q!.id, newTheme: { label: "Runs small?", kind: "fit", storeTheme: "Fit" } }]);
    const options = await getThemeOptions(pool, own.storeId, own.productId);
    expect(options.productThemes.map((t) => t.label)).toEqual(["Does it run small?"]);
    expect(options.storeThemes.map((t) => t.label)).toEqual(["Sizing"]);
  });

  it("applies simultaneous runs one at a time", async () => {
    const q1 = await ask(own, "Does it run small?");
    const q2 = await ask(own, "Should I size up?");
    await Promise.all([
      applyThemeAssignments(pool, own.storeId, own.productId, [{ questionId: q1!.id, newTheme: { label: "Sizing question", kind: "fit", storeTheme: "Sizing" } }, { questionId: q2!.id, newTheme: { label: "Sizing question", kind: "fit", storeTheme: "Sizing" } }]),
      applyThemeAssignments(pool, own.storeId, own.productId, [{ questionId: q1!.id, newTheme: { label: "Sizing question", kind: "fit", storeTheme: "Sizing" } }, { questionId: q2!.id, newTheme: { label: "Sizing question", kind: "fit", storeTheme: "Sizing" } }]),
    ]);
    const options = await getThemeOptions(pool, own.storeId, own.productId);
    expect(options.productThemes).toHaveLength(1);
    expect(options.storeThemes).toHaveLength(1);
  });

  it("ignores assignments for another store's questions or themes", async () => {
    const mine = await ask(own, "Does it run small?");
    const theirs = await ask(other, "Does it run small?");
    await applyThemeAssignments(pool, other.storeId, other.productId, [
      { questionId: theirs!.id, newTheme: { label: "Fit", kind: "fit", storeTheme: "Sizing" } },
    ]);
    const theirTheme = (await getThemeOptions(pool, other.storeId, other.productId)).productThemes[0]!;
    await applyThemeAssignments(pool, own.storeId, own.productId, [
      { questionId: theirs!.id, newTheme: { label: "Hijack", kind: "other", storeTheme: "Hijack" } },
      { questionId: mine!.id, themeId: theirTheme.id },
    ]);
    expect((await getUngroupedQuestions(pool, own.storeId, own.productId, 20)).map((q) => q.id)).toEqual([mine!.id]);
    const { rows } = await pool.query(`select theme_id from product_questions where id = $1`, [theirs!.id]);
    expect(rows[0].theme_id).toBe(theirTheme.id);
  });
});
