import type { Pool } from "pg";

export interface StoreReactionTotals {
  loved: number;
  liked: number;
  passed: number;
  total: number;
}

export interface TopReactedProduct {
  product_id: string;
  product_title: string;
  loved: number;
  liked: number;
  passed: number;
}

export interface CustomerSummary {
  identified_customers: number;
  sessions_7d: number;
  identified_sessions_7d: number;
}

export interface TapSummary {
  total_7d: number;
  total_30d: number;
  unique_sessions_7d: number;
}

export interface TopProduct {
  product_id: string;
  product_title: string;
  tap_count: number;
}

export interface DeviceBreakdown {
  device_type: string;
  tap_count: number;
}

export interface DailyTap {
  date: string;
  tap_count: number;
}

export async function getTapSummary(
  pool: Pool,
  storeId: string,
): Promise<TapSummary> {
  const { rows } = await pool.query<TapSummary>(
    `select
       count(*) filter (where timestamp >= now() - interval '7 days')  as total_7d,
       count(*) filter (where timestamp >= now() - interval '30 days') as total_30d,
       count(distinct session_id) filter (where timestamp >= now() - interval '7 days') as unique_sessions_7d
     from tap_events
     where store_id = $1`,
    [storeId],
  );
  const row = rows[0];
  return {
    total_7d: Number(row?.total_7d ?? 0),
    total_30d: Number(row?.total_30d ?? 0),
    unique_sessions_7d: Number(row?.unique_sessions_7d ?? 0),
  };
}

export async function getTopProducts(
  pool: Pool,
  storeId: string,
  days: number,
  limit = 10,
): Promise<TopProduct[]> {
  const { rows } = await pool.query<TopProduct>(
    `select t.product_id, p.title as product_title, count(*) as tap_count
       from tap_events t
       left join products p on p.id = t.product_id
      where t.store_id = $1
        and t.timestamp >= now() - ($2 || ' days')::interval
        and t.product_id is not null
      group by t.product_id, p.title
      order by tap_count desc
      limit $3`,
    [storeId, days, limit],
  );
  return rows.map((r) => ({ ...r, tap_count: Number(r.tap_count) }));
}

export async function getDeviceBreakdown(
  pool: Pool,
  storeId: string,
  days: number,
): Promise<DeviceBreakdown[]> {
  const { rows } = await pool.query<DeviceBreakdown>(
    `select coalesce(device_type, 'unknown') as device_type, count(*) as tap_count
       from tap_events
      where store_id = $1
        and timestamp >= now() - ($2 || ' days')::interval
      group by device_type
      order by tap_count desc`,
    [storeId, days],
  );
  return rows.map((r) => ({ ...r, tap_count: Number(r.tap_count) }));
}

export async function getDailyTaps(
  pool: Pool,
  storeId: string,
  days: number,
): Promise<DailyTap[]> {
  const { rows } = await pool.query<DailyTap>(
    `select to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') as date,
            count(*) as tap_count
       from tap_events
      where store_id = $1
        and timestamp >= now() - ($2 || ' days')::interval
      group by date_trunc('day', timestamp)
      order by date_trunc('day', timestamp)`,
    [storeId, days],
  );
  return rows.map((r) => ({ ...r, tap_count: Number(r.tap_count) }));
}

export async function getStoreReactionTotals(
  pool: Pool,
  storeId: string,
  days: number,
): Promise<StoreReactionTotals> {
  const { rows } = await pool.query<{ loved: string; liked: string; passed: string }>(
    `select
       count(*) filter (where r.reaction = 'loved')  as loved,
       count(*) filter (where r.reaction = 'liked')  as liked,
       count(*) filter (where r.reaction = 'passed') as passed
     from tap_reactions r
     join tags t on t.id = r.tag_id
     where t.store_id = $1
       and r.created_at >= now() - ($2 || ' days')::interval`,
    [storeId, days],
  );
  const row = rows[0];
  const loved  = Number(row?.loved  ?? 0);
  const liked  = Number(row?.liked  ?? 0);
  const passed = Number(row?.passed ?? 0);
  return { loved, liked, passed, total: loved + liked + passed };
}

export async function getTopReactedProducts(
  pool: Pool,
  storeId: string,
  days: number,
  limit = 10,
): Promise<TopReactedProduct[]> {
  const { rows } = await pool.query<{ product_id: string; product_title: string; loved: string; liked: string; passed: string }>(
    `select p.id as product_id, p.title as product_title,
       count(*) filter (where r.reaction = 'loved')  as loved,
       count(*) filter (where r.reaction = 'liked')  as liked,
       count(*) filter (where r.reaction = 'passed') as passed
     from tap_reactions r
     join tags t on t.id = r.tag_id
     join products p on p.id = t.product_id
     where t.store_id = $1
       and r.created_at >= now() - ($2 || ' days')::interval
     group by p.id, p.title
     order by loved desc, liked desc
     limit $3`,
    [storeId, days, limit],
  );
  return rows.map((r) => ({
    product_id:    r.product_id,
    product_title: r.product_title,
    loved:  Number(r.loved),
    liked:  Number(r.liked),
    passed: Number(r.passed),
  }));
}

export async function getCustomerSummary(
  pool: Pool,
  storeId: string,
): Promise<CustomerSummary> {
  const { rows: custRows } = await pool.query<{ total: string }>(
    `select count(*) as total from customers where store_id = $1`,
    [storeId],
  );
  const { rows: activeRows } = await pool.query<{ active_7d: string }>(
    `select count(distinct customer_id) as active_7d
     from customer_taps
     where store_id = $1
       and last_tapped_at >= now() - interval '7 days'`,
    [storeId],
  );
  const { rows: sessRows } = await pool.query<{ sessions: string }>(
    `select count(distinct session_id) as sessions
     from tap_events
     where store_id = $1
       and timestamp >= now() - interval '7 days'`,
    [storeId],
  );
  return {
    identified_customers:   Number(custRows[0]?.total      ?? 0),
    sessions_7d:            Number(sessRows[0]?.sessions   ?? 0),
    identified_sessions_7d: Number(activeRows[0]?.active_7d ?? 0),
  };
}
