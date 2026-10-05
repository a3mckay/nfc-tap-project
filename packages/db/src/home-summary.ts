import type { Pool } from "pg";

// PRD v4 §7 Step 15i: the admin home page's at-a-glance numbers: tap activity
// and customer questions (docs/PRD-ai-assistant.md D44). Weeks are rolling
// 7-day windows; staff taps and staff questions aren't counted.

export interface HomeSummary {
  taps: { thisWeek: number; lastWeek: number; topProducts: Array<{ title: string; taps: number }> };
  questions: { thisWeek: number; unanswered: number; topTheme: string | null; mostAsked: { productId: string; title: string; count: number } | null };
}

export async function getHomeSummary(pool: Pool, storeId: string): Promise<HomeSummary> {
  const [weeks, top, q, theme, most] = await Promise.all([
    pool.query<{ this_week: number; last_week: number }>(
      `select count(*) filter (where timestamp > now() - interval '7 days')::int as this_week,
              count(*) filter (where timestamp <= now() - interval '7 days' and timestamp > now() - interval '14 days')::int as last_week
         from tap_events where store_id = $1 and timestamp > now() - interval '14 days'`,
      [storeId],
    ),
    pool.query<{ title: string; taps: number }>(
      `select p.title, count(*)::int as taps
         from tap_events e join products p on p.id = e.product_id
        where e.store_id = $1 and e.timestamp > now() - interval '7 days'
        group by p.id, p.title order by count(*) desc, p.title limit 3`,
      [storeId],
    ),
    pool.query<{ this_week: number; unanswered: number }>(
      `select count(*) filter (where created_at > now() - interval '7 days')::int as this_week,
              count(*) filter (where status = 'unanswered')::int as unanswered
         from product_questions where store_id = $1 and asked_by = 'customer'`,
      [storeId],
    ),
    pool.query<{ label: string }>(
      `select coalesce(st.label, t.label) as label
         from product_questions q
         join question_themes t on t.id = q.theme_id
         left join question_themes st on st.id = t.parent_id
        where q.store_id = $1 and q.asked_by = 'customer' and q.created_at > now() - interval '7 days'
        group by coalesce(st.label, t.label) order by count(*) desc limit 1`,
      [storeId],
    ),
    pool.query<{ product_id: string; title: string; count: number }>(
      `select p.id as product_id, p.title, count(*)::int as count
         from product_questions q join products p on p.id = q.product_id
        where q.store_id = $1 and q.asked_by = 'customer' and q.created_at > now() - interval '7 days'
        group by p.id, p.title order by count(*) desc, p.title limit 1`,
      [storeId],
    ),
  ]);
  const m = most.rows[0];
  return {
    taps: { thisWeek: weeks.rows[0]?.this_week ?? 0, lastWeek: weeks.rows[0]?.last_week ?? 0, topProducts: top.rows },
    questions: {
      thisWeek: q.rows[0]?.this_week ?? 0,
      unanswered: q.rows[0]?.unanswered ?? 0,
      topTheme: theme.rows[0]?.label ?? null,
      mostAsked: m ? { productId: m.product_id, title: m.title, count: m.count } : null,
    },
  };
}
