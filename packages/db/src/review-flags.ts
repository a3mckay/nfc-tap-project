import type { Pool } from "pg";

// PRD v4 §7 Step 15k: things on a product the store should check
// (docs/PRD-ai-assistant.md D49, D50). Each check run replaces its own kind.

export type ReviewFlagKind = "contradiction" | "mismatch";

export async function saveReviewFlags(pool: Pool, storeId: string, productId: string, kind: ReviewFlagKind, messages: string[]): Promise<void> {
  await pool.query(
    `insert into product_review_flags (store_id, product_id, kind, messages)
     select p.store_id, p.id, $3, $4::jsonb from products p where p.id = $2 and p.store_id = $1
     on conflict (store_id, product_id, kind) do update set messages = excluded.messages, checked_at = now()`,
    [storeId, productId, kind, JSON.stringify(messages.map((m) => m.trim()).filter(Boolean).slice(0, 10))],
  );
}

export async function getReviewFlags(pool: Pool, storeId: string, productId: string): Promise<Array<{ kind: ReviewFlagKind; message: string }>> {
  const { rows } = await pool.query<{ kind: ReviewFlagKind; messages: string[] }>(
    `select kind, messages from product_review_flags where store_id = $1 and product_id = $2 order by kind`,
    [storeId, productId],
  );
  return rows.flatMap((r) => r.messages.map((message) => ({ kind: r.kind, message })));
}
