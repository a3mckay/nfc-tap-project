import type { Pool } from "pg";

// PRD v4 §7 Step 15f: questions grouped into product themes ("Does it run
// small?") that roll up into store-wide themes ("Sizing") (D8). Grouping runs
// right after a question is saved; anything left ungrouped is picked up by the
// next run for that product.

export interface UngroupedQuestion {
  id: string;
  question_text: string;
  sources: Array<{ kind: string }>;
}

export async function getUngroupedQuestions(pool: Pool, storeId: string, productId: string, limit: number): Promise<UngroupedQuestion[]> {
  const { rows } = await pool.query<UngroupedQuestion>(
    `select id, question_text, sources from product_questions
      where store_id = $1 and product_id = $2 and theme_id is null and status <> 'dismissed'
      order by created_at, id
      limit $3`,
    [storeId, productId, limit],
  );
  return rows;
}

export interface ThemeOptions {
  productThemes: Array<{ id: string; label: string; kind: string | null; storeTheme: string | null }>;
  storeThemes: Array<{ id: string; label: string; kind: string | null }>;
}

export async function getThemeOptions(pool: Pool, storeId: string, productId: string): Promise<ThemeOptions> {
  const [product, store] = await Promise.all([
    pool.query<ThemeOptions["productThemes"][number]>(
      `select t.id, t.label, t.kind, p.label as "storeTheme"
         from question_themes t left join question_themes p on p.id = t.parent_id
        where t.store_id = $1 and t.product_id = $2
        order by t.created_at`,
      [storeId, productId],
    ),
    pool.query<ThemeOptions["storeThemes"][number]>(
      `select id, label, kind from question_themes where store_id = $1 and product_id is null order by created_at`,
      [storeId],
    ),
  ]);
  return { productThemes: product.rows, storeThemes: store.rows };
}

export type ThemeAssignment =
  | { questionId: string; themeId: string }
  | { questionId: string; newTheme: { label: string; kind: string; storeTheme: string } };

// Applies a grouping run. New product themes are created under the store-wide
// theme with the same label (case-insensitive), creating that too if needed.
// Questions, themes and products are all checked against the store. Runs for
// the same store are applied one at a time (two questions asked at once can
// start two runs), and a new theme is only created for a question that's still
// ungrouped, so simultaneous runs don't leave duplicate or empty themes.
export async function applyThemeAssignments(
  pool: Pool,
  storeId: string,
  productId: string,
  assignments: ThemeAssignment[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtext('question-themes:' || $1))`, [storeId]);
    const created = new Map<string, string>();   // new product-theme label → id, within this run
    for (const a of assignments) {
      let themeId: string | null = null;
      if ("themeId" in a) {
        const { rows } = await client.query<{ id: string }>(
          `select id from question_themes where id = $1 and store_id = $2 and product_id = $3`,
          [a.themeId, storeId, productId],
        );
        themeId = rows[0]?.id ?? null;
      } else {
        const ungrouped = await client.query(
          `select 1 from product_questions where id = $1 and store_id = $2 and product_id = $3 and theme_id is null`,
          [a.questionId, storeId, productId],
        );
        if (!ungrouped.rowCount) continue;   // another run already grouped it
        const key = a.newTheme.label.trim().toLowerCase();
        themeId = created.get(key) ?? null;
        if (!themeId) {
          const parentId = await storeThemeId(client, storeId, a.newTheme.storeTheme.trim(), a.newTheme.kind);
          const { rows } = await client.query<{ id: string }>(
            `insert into question_themes (store_id, product_id, parent_id, label, kind)
             select $1, p.id, $3, $4, $5 from products p where p.id = $2 and p.store_id = $1
             returning id`,
            [storeId, productId, parentId, a.newTheme.label.trim(), a.newTheme.kind],
          );
          themeId = rows[0]?.id ?? null;
          if (themeId) created.set(key, themeId);
        }
      }
      if (!themeId) continue;
      await client.query(
        `update product_questions set theme_id = $1 where id = $2 and store_id = $3 and product_id = $4 and theme_id is null`,
        [themeId, a.questionId, storeId, productId],
      );
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function storeThemeId(client: { query: Pool["query"] }, storeId: string, label: string, kind: string): Promise<string> {
  const found = await client.query<{ id: string }>(
    `select id from question_themes where store_id = $1 and product_id is null and lower(label) = lower($2) limit 1`,
    [storeId, label],
  );
  if (found.rows[0]) return found.rows[0].id;
  const { rows } = await client.query<{ id: string }>(
    `insert into question_themes (store_id, label, kind) values ($1, $2, $3) returning id`,
    [storeId, label, kind],
  );
  return rows[0]!.id;
}
