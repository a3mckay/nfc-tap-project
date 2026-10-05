// PRD v4 §7 Step 8c: raw taps, reactions and chat questions are kept for 24
// months (PRD v4 §8; docs/PRD-ai-assistant.md D34), as the privacy page says.
// Daily totals and signed-in customers' own history aren't raw data and stay.
import type { Pool } from "pg";

export const RETENTION_MONTHS = 24;

export interface DeletedCounts {
  tap_events: number;
  tap_reactions: number;
  product_questions: number;
}

export async function deleteExpiredRawData(pool: Pool): Promise<DeletedCounts> {
  const cutoff = `now() - make_interval(months => ${RETENTION_MONTHS})`;
  const taps = await pool.query(`delete from tap_events where timestamp < ${cutoff}`);
  const reactions = await pool.query(`delete from tap_reactions where created_at < ${cutoff}`);
  const questions = await pool.query(`delete from product_questions where created_at < ${cutoff}`);
  return {
    tap_events: taps.rowCount ?? 0,
    tap_reactions: reactions.rowCount ?? 0,
    product_questions: questions.rowCount ?? 0,
  };
}
