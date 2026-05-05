import type { Pool } from "pg";

export type Reaction = "loved" | "liked" | "passed";

export interface ReactionSummary {
  product_id: string;
  title: string;
  loved: string;
  liked: string;
  passed: string;
}

export async function upsertReaction(
  pool: Pool,
  tagId: string,
  sessionId: string,
  reaction: Reaction,
): Promise<void> {
  await pool.query(
    `insert into tap_reactions (tag_id, session_id, reaction)
     values ($1, $2, $3)
     on conflict (tag_id, session_id)
     do update set reaction = excluded.reaction, created_at = now()`,
    [tagId, sessionId, reaction],
  );
}

// Counts of each reaction type for the product behind a tag, excluding the current session.
// Used for post-reaction social proof: "You and 11 others loved this".
export async function getProductReactionCountsExcludingSession(
  pool: Pool,
  tagId: string,
  sessionId: string,
): Promise<{ loved: number; liked: number; passed: number }> {
  const { rows } = await pool.query<{ loved: string; liked: string; passed: string }>(
    `with tag_product as (
       select product_id from tags where id = $1
     )
     select
       count(*) filter (where r.reaction = 'loved')  as loved,
       count(*) filter (where r.reaction = 'liked')  as liked,
       count(*) filter (where r.reaction = 'passed') as passed
       from tap_reactions r
       join tags t on t.id = r.tag_id
      where t.product_id = (select product_id from tag_product)
        and r.session_id <> $2`,
    [tagId, sessionId],
  );
  const r = rows[0];
  return {
    loved:  parseInt(r?.loved  ?? "0", 10),
    liked:  parseInt(r?.liked  ?? "0", 10),
    passed: parseInt(r?.passed ?? "0", 10),
  };
}

export async function getReactionSummaryByStore(
  pool: Pool,
  storeId: string,
): Promise<ReactionSummary[]> {
  const { rows } = await pool.query<ReactionSummary>(
    `select p.id as product_id, p.title,
       count(*) filter (where r.reaction = 'loved') as loved,
       count(*) filter (where r.reaction = 'liked') as liked,
       count(*) filter (where r.reaction = 'passed') as passed
     from tags t
     join products p on p.id = t.product_id
     join tap_reactions r on r.tag_id = t.id
     where p.store_id = $1
     group by p.id, p.title
     order by (count(*) filter (where r.reaction = 'loved')) desc`,
    [storeId],
  );
  return rows;
}
