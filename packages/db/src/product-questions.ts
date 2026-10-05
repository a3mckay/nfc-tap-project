import type { Pool } from "pg";
import { redactPii, type PiiType } from "./pii.js";

// PRD v4 §7 Step 15a: questions asked through the Shelf-Side AI Assistant
// (docs/PRD-ai-assistant.md §5). Customers are identified only by the anonymous
// session cookie, and text is stripped of personal details here, on write, so
// no caller can store raw PII.

export type QuestionStatus = "answered" | "unanswered" | "staff_answered" | "dismissed";

export interface QuestionSource {
  kind: string;   // product_details, store_answer, product_research, reviews, store_policy
  ref?: string;
}

export interface NewQuestion {
  storeId: string;
  productId: string;
  tagId?: string | null;
  sessionId: string | null;
  askedBy: "customer" | "staff";
  staffId?: string | null;
  questionText: string;
  answerText: string | null;
  sources: QuestionSource[];
  status: "answered" | "unanswered";
  language?: string | null;
}

export interface ProductQuestion {
  id: string;
  store_id: string;
  product_id: string;
  tag_id: string | null;
  session_id: string | null;
  asked_by: "customer" | "staff";
  staff_id: string | null;
  question_text: string;
  pii_removed: PiiType[];
  answer_text: string | null;
  sources: QuestionSource[];
  status: QuestionStatus;
  theme_id: string | null;
  language: string | null;
  created_at: Date;
}

// Saves a question if the product (and staff member, for staff questions)
// belongs to the store; null otherwise.
export async function recordQuestion(pool: Pool, q: NewQuestion): Promise<ProductQuestion | null> {
  const question = redactPii(q.questionText);
  const answer = q.answerText === null ? null : redactPii(q.answerText).text;
  const staffId = q.askedBy === "staff" ? (q.staffId ?? null) : null;

  const { rows } = await pool.query<ProductQuestion>(
    `insert into product_questions
       (store_id, product_id, tag_id, session_id, asked_by, staff_id,
        question_text, pii_removed, answer_text, sources, status, language)
     select p.store_id, p.id, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $12
       from products p
      where p.id = $2 and p.store_id = $1
        and ($6::uuid is null or exists (
              select 1 from store_staff s where s.id = $6 and s.store_id = $1 and s.revoked_at is null))
     returning *`,
    [
      q.storeId, q.productId, q.tagId ?? null, q.sessionId, q.askedBy, staffId,
      question.text, JSON.stringify(question.removed), answer, JSON.stringify(q.sources), q.status,
      q.language ?? null,
    ],
  );
  return rows[0] ?? null;
}

// How many questions this customer session has asked about the product in the
// last `hours` — the per-visit cap (D22).
export async function countRecentSessionQuestions(
  pool: Pool,
  sessionId: string,
  productId: string,
  hours: number,
): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `select count(*)::int as n from product_questions
      where session_id = $1 and product_id = $2 and asked_by = 'customer'
        and created_at > now() - ($3 || ' hours')::interval`,
    [sessionId, productId, hours],
  );
  return rows[0]?.n ?? 0;
}

// ── The hidden answer pool (D11, D12) ─────────────────────────────────────

export interface PoolAnswer {
  id: string;
  product_id: string | null;   // null = store-wide (includes store policies)
  question: string;
  answer: string;
}

// Answers written by the store's team: this product's first, then store-wide.
export async function getActiveAnswers(pool: Pool, storeId: string, productId: string): Promise<PoolAnswer[]> {
  const { rows } = await pool.query<PoolAnswer>(
    `select id, product_id, question, answer from product_answers
      where store_id = $1 and retired_at is null and (product_id = $2 or product_id is null)
      order by (product_id is null), updated_at desc`,
    [storeId, productId],
  );
  return rows;
}

// Recent customer questions about a product, for the staff Ask box (D31).
export async function getRecentQuestions(
  pool: Pool,
  storeId: string,
  productId: string,
  limit: number,
): Promise<Array<{ question_text: string; answer_text: string | null }>> {
  const { rows } = await pool.query<{ question_text: string; answer_text: string | null }>(
    `select question_text, answer_text from product_questions
      where store_id = $1 and product_id = $2 and asked_by = 'customer' and status <> 'dismissed'
      order by created_at desc limit $3`,
    [storeId, productId, limit],
  );
  return rows;
}
