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

export interface CustomerSegment {
  label: string;
  customer_count: number;
  avg_taps: number;
}

export async function getCustomerSegments(
  pool: Pool,
  storeId: string,
): Promise<CustomerSegment[]> {
  const { rows } = await pool.query<{ label: string; customer_count: string; avg_taps: string }>(
    `with tap_counts as (
       select ct.customer_id, sum(ct.tap_count) as total_taps
       from customer_taps ct
       join customers c on c.id = ct.customer_id
       where ct.store_id = $1
       group by ct.customer_id
     ),
     bucketed as (
       select
         case
           when total_taps = 1 then 'One-time'
           when total_taps between 2 and 5 then 'Casual'
           else 'Engaged'
         end as label,
         total_taps
       from tap_counts
     )
     select label,
            count(*)    as customer_count,
            avg(total_taps)  as avg_taps
     from bucketed
     group by label
     order by
       case label
         when 'One-time' then 1
         when 'Casual'   then 2
         else 3
       end`,
    [storeId],
  );
  return rows.map((r) => ({
    label:          r.label,
    customer_count: Number(r.customer_count),
    avg_taps:       Math.round(Number(r.avg_taps) * 10) / 10,
  }));
}

export interface OfferStats {
  total_delivered: number;
  active_offers: number;
  offers_expiring_soon: number;
}

export async function getOfferStats(
  pool: Pool,
  storeId: string,
): Promise<OfferStats> {
  const { rows: deliveredRows } = await pool.query<{ total: string }>(
    `select count(*) as total
     from customer_offers co
     where co.store_id = $1`,
    [storeId],
  );
  const { rows: offerRows } = await pool.query<{ active: string; expiring_soon: string }>(
    `select
       count(*) filter (where enabled = true)  as active,
       count(*) filter (
         where enabled = true
           and expires_at is not null
           and expires_at <= now() + interval '7 days'
           and expires_at > now()
       ) as expiring_soon
     from store_offers
     where store_id = $1`,
    [storeId],
  );
  return {
    total_delivered:      Number(deliveredRows[0]?.total       ?? 0),
    active_offers:        Number(offerRows[0]?.active          ?? 0),
    offers_expiring_soon: Number(offerRows[0]?.expiring_soon   ?? 0),
  };
}

export async function getCustomerSummary(
  pool: Pool,
  storeId: string,
): Promise<CustomerSummary> {
  const { rows: custRows } = await pool.query<{ total: string }>(
    `select count(distinct customer_id) as total from customer_taps where store_id = $1`,
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
