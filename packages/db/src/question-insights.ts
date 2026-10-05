import type { Pool } from "pg";
import type { PiiType } from "./pii.js";

// PRD v4 §7 Step 15g: the admin Questions tab (docs/PRD-ai-assistant.md §3.C).
// Owners, managers and co-managers see what customers ask, grouped by theme,
// and answer into the hidden answer pool (D11, D12), which applies to future
// questions only (D38).

export interface QuestionProductRow {
  product_id: string;
  title: string;
  total: number;
  new_count: number;
  unanswered: number;
  top_theme: string | null;
  last_asked: Date;
}

// Every product with at least one (non-dismissed) question; new or unanswered first.
export async function listQuestionProducts(pool: Pool, storeId: string): Promise<QuestionProductRow[]> {
  const { rows } = await pool.query<QuestionProductRow>(
    `with q as (
       select pq.* from product_questions pq where pq.store_id = $1 and pq.status <> 'dismissed'
     ), top as (
       select distinct on (q.product_id) q.product_id, t.label
         from q join question_themes t on t.id = q.theme_id
        group by q.product_id, t.label
        order by q.product_id, count(*) desc, max(q.created_at) desc
     )
     select p.id as product_id, p.title,
            count(*)::int as total,
            count(*) filter (where r.reviewed_at is null or q.created_at > r.reviewed_at)::int as new_count,
            count(*) filter (where q.status = 'unanswered')::int as unanswered,
            top.label as top_theme,
            max(q.created_at) as last_asked
       from q
       join products p on p.id = q.product_id
       left join product_question_reviews r on r.store_id = q.store_id and r.product_id = q.product_id
       left join top on top.product_id = q.product_id
      group by p.id, p.title, top.label
      order by (count(*) filter (where r.reviewed_at is null or q.created_at > r.reviewed_at) > 0
                or count(*) filter (where q.status = 'unanswered') > 0) desc,
               max(q.created_at) desc`,
    [storeId],
  );
  return rows;
}

export async function markProductReviewed(pool: Pool, storeId: string, productId: string): Promise<void> {
  await pool.query(
    `insert into product_question_reviews (store_id, product_id)
     select p.store_id, p.id from products p where p.id = $2 and p.store_id = $1
     on conflict (store_id, product_id) do update set reviewed_at = now()`,
    [storeId, productId],
  );
}

export interface ThemeSummary {
  id: string | null;          // null: questions not grouped yet
  label: string;
  store_theme: string | null;
  count: number;
  unanswered: number;
  latest_answer: string | null;
  last_asked: Date;
}

export interface VerbatimQuestion {
  id: string;
  question_text: string;
  answer_text: string | null;
  status: string;
  asked_by: "customer" | "staff";
  staff_name: string | null;
  pii_removed: PiiType[];
  theme_id: string | null;
  theme_label: string | null;
  created_at: Date;
}

export interface ProductQuestionView {
  product: { id: string; title: string };
  themes: ThemeSummary[];
  questions: VerbatimQuestion[];
  answers: Array<{ id: string; product_id: string | null; question: string; answer: string; updated_at: Date }>;
}

export async function getProductQuestionView(pool: Pool, storeId: string, productId: string): Promise<ProductQuestionView | null> {
  const product = await pool.query<{ id: string; title: string }>(
    `select id, title from products where id = $1 and store_id = $2`,
    [productId, storeId],
  );
  if (!product.rows[0]) return null;

  const [themes, questions, answers] = await Promise.all([
    pool.query<ThemeSummary>(
      `select t.id, coalesce(t.label, 'Not grouped yet') as label, p.label as store_theme,
              count(*)::int as count,
              count(*) filter (where q.status = 'unanswered')::int as unanswered,
              (array_agg(q.answer_text order by q.created_at desc) filter (where q.answer_text is not null))[1] as latest_answer,
              max(q.created_at) as last_asked
         from product_questions q
         left join question_themes t on t.id = q.theme_id
         left join question_themes p on p.id = t.parent_id
        where q.store_id = $1 and q.product_id = $2 and q.status <> 'dismissed'
        group by t.id, t.label, p.label
        order by (t.id is null), count(*) desc, max(q.created_at) desc`,
      [storeId, productId],
    ),
    pool.query<VerbatimQuestion>(
      `select q.id, q.question_text, q.answer_text, q.status, q.asked_by, st.name as staff_name,
              q.pii_removed, q.theme_id, t.label as theme_label, q.created_at
         from product_questions q
         left join question_themes t on t.id = q.theme_id
         left join store_staff st on st.id = q.staff_id
        where q.store_id = $1 and q.product_id = $2 and q.status <> 'dismissed'
        order by q.created_at desc, q.id desc
        limit 300`,
      [storeId, productId],
    ),
    pool.query<ProductQuestionView["answers"][number]>(
      `select id, product_id, question, answer, updated_at from product_answers
        where store_id = $1 and (product_id = $2 or product_id is null) and retired_at is null
        order by (product_id is null), updated_at desc`,
      [storeId, productId],
    ),
  ]);
  return { product: product.rows[0], themes: themes.rows, questions: questions.rows, answers: answers.rows };
}

export interface AnswerAuthor {
  role: "owner" | "manager" | "co_manager";
  staffId: string | null;     // managers and co-managers
}

// Adds a team answer to the pool for a theme, one question, or the product in
// general, and marks the matching unanswered questions as answered by the team.
export async function answerQuestions(
  pool: Pool,
  storeId: string,
  productId: string,
  input: { themeId: string | null; questionId: string | null; question: string; answer: string; author: AnswerAuthor },
): Promise<{ id: string; question: string; answer: string } | null> {
  const { rows } = await pool.query<{ id: string; question: string; answer: string }>(
    `insert into product_answers (store_id, product_id, theme_id, question, answer, author_role, author_staff_id)
     select p.store_id, p.id,
            (select t.id from question_themes t where t.id = $3 and t.store_id = $1),
            $5, $6, $7, $8
       from products p
      where p.id = $2 and p.store_id = $1
        and ($4::uuid is null or exists (select 1 from product_questions q where q.id = $4 and q.store_id = $1 and q.product_id = $2))
     returning id, question, answer`,
    [storeId, productId, input.themeId, input.questionId, input.question.trim(), input.answer.trim(), input.author.role, input.author.staffId],
  );
  if (!rows[0]) return null;
  await pool.query(
    `update product_questions set status = 'staff_answered'
      where store_id = $1 and product_id = $2 and status = 'unanswered'
        and (($3::uuid is not null and theme_id = $3) or ($4::uuid is not null and id = $4))`,
    [storeId, productId, input.themeId, input.questionId],
  );
  return rows[0];
}

export async function dismissQuestion(pool: Pool, storeId: string, questionId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update product_questions set status = 'dismissed' where id = $1 and store_id = $2`,
    [questionId, storeId],
  );
  return (rowCount ?? 0) > 0;
}

export async function retireAnswer(pool: Pool, storeId: string, answerId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update product_answers set retired_at = now(), updated_at = now() where id = $1 and store_id = $2 and retired_at is null`,
    [answerId, storeId],
  );
  return (rowCount ?? 0) > 0;
}

// Explicit promotions (D12): never automatic.
export async function addAnswerToFaq(pool: Pool, storeId: string, productId: string, question: string, answer: string): Promise<boolean> {
  const item = JSON.stringify([{ question: question.trim(), answer: answer.trim() }]);
  const { rowCount } = await pool.query(
    `insert into enrichments (product_id, faq)
     select p.id, $3::jsonb from products p where p.id = $2 and p.store_id = $1
     on conflict (product_id) do update set faq = enrichments.faq || excluded.faq, updated_at = now()`,
    [storeId, productId, item],
  );
  return (rowCount ?? 0) > 0;
}

export async function addAnswerToTraining(pool: Pool, storeId: string, productId: string, question: string, answer: string): Promise<boolean> {
  const item = JSON.stringify([{ question: question.trim(), answer: answer.trim() }]);
  const { rowCount } = await pool.query(
    `insert into product_training (product_id, store_id, common_questions, updated_at)
     select p.id, p.store_id, $3::jsonb, now() from products p where p.id = $2 and p.store_id = $1
     on conflict (product_id) do update set common_questions = product_training.common_questions || excluded.common_questions, updated_at = now()`,
    [storeId, productId, item],
  );
  return (rowCount ?? 0) > 0;
}
