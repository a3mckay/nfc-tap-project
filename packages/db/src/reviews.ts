import type { Pool } from "pg";

export type ReviewProvider = "judgeme" | "loox" | "okendo" | "yotpo" | "stamped" | "public_search" | "manual";
export type ReviewStatus   = "approved" | "pending" | "rejected";

export interface ReviewSource {
  id: string;
  store_id: string;
  provider: ReviewProvider;
  config: Record<string, unknown>;
  last_synced_at: Date | null;
  enabled: boolean;
  created_at: Date;
}

export interface ExternalReview {
  id: string;
  store_id: string;
  product_id: string;
  provider: ReviewProvider;
  external_id: string | null;
  author: string | null;
  author_avatar_url: string | null;
  rating: string | null; // numeric comes back as string
  title: string | null;
  body: string;
  source_url: string | null;
  source_label: string | null;
  published_at: Date | null;
  status: ReviewStatus;
  fetched_at: Date;
}

export async function upsertReviewSource(
  pool: Pool,
  storeId: string,
  provider: ReviewProvider,
  config: Record<string, unknown>,
): Promise<void> {
  await pool.query(
    `insert into review_sources (store_id, provider, config)
     values ($1, $2, $3)
     on conflict (store_id, provider)
     do update set config = excluded.config, enabled = true`,
    [storeId, provider, JSON.stringify(config)],
  );
}

export async function getReviewSourcesByStore(
  pool: Pool,
  storeId: string,
): Promise<ReviewSource[]> {
  const { rows } = await pool.query<ReviewSource>(
    `select * from review_sources where store_id = $1 order by created_at`,
    [storeId],
  );
  return rows;
}

export async function setReviewSourceLastSynced(
  pool: Pool,
  id: string,
): Promise<void> {
  await pool.query(`update review_sources set last_synced_at = now() where id = $1`, [id]);
}

export interface ExternalReviewInput {
  store_id: string;
  product_id: string;
  provider: ReviewProvider;
  external_id: string | null;
  author: string | null;
  author_avatar_url: string | null;
  rating: number | null;
  title: string | null;
  body: string;
  source_url: string | null;
  source_label: string | null;
  published_at: Date | null;
  status?: ReviewStatus;
}

export async function upsertExternalReview(
  pool: Pool,
  r: ExternalReviewInput,
): Promise<void> {
  await pool.query(
    `insert into external_reviews
       (store_id, product_id, provider, external_id, author, author_avatar_url,
        rating, title, body, source_url, source_label, published_at, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     on conflict (provider, external_id, product_id)
     do update set
       author            = excluded.author,
       author_avatar_url = excluded.author_avatar_url,
       rating            = excluded.rating,
       title             = excluded.title,
       body              = excluded.body,
       source_url        = excluded.source_url,
       source_label      = excluded.source_label,
       published_at      = excluded.published_at,
       fetched_at        = now()`,
    [
      r.store_id, r.product_id, r.provider, r.external_id, r.author, r.author_avatar_url,
      r.rating, r.title, r.body, r.source_url, r.source_label, r.published_at,
      r.status ?? "approved",
    ],
  );
}

// Returns approved reviews for a product (used on the tap page).
export async function getApprovedReviewsByProduct(
  pool: Pool,
  productId: string,
): Promise<ExternalReview[]> {
  const { rows } = await pool.query<ExternalReview>(
    `select * from external_reviews
      where product_id = $1 and status = 'approved'
      order by published_at desc nulls last, fetched_at desc
      limit 50`,
    [productId],
  );
  return rows;
}

export interface ReviewAggregate {
  count: number;
  avg_rating: number | null;
}

export async function getReviewAggregateByProduct(
  pool: Pool,
  productId: string,
): Promise<ReviewAggregate> {
  const { rows } = await pool.query<{ count: string; avg_rating: string | null }>(
    `select count(*)::text as count, avg(rating)::text as avg_rating
       from external_reviews
      where product_id = $1 and status = 'approved' and rating is not null`,
    [productId],
  );
  const r = rows[0];
  return {
    count: parseInt(r?.count ?? "0", 10),
    avg_rating: r?.avg_rating ? parseFloat(r.avg_rating) : null,
  };
}

// Pending reviews (from public web search) awaiting store-owner approval.
export async function getPendingReviewsByStore(
  pool: Pool,
  storeId: string,
): Promise<Array<ExternalReview & { product_title: string | null }>> {
  const { rows } = await pool.query<ExternalReview & { product_title: string | null }>(
    `select er.*, p.title as product_title
       from external_reviews er
       join products p on p.id = er.product_id
      where er.store_id = $1 and er.status = 'pending'
      order by er.fetched_at desc`,
    [storeId],
  );
  return rows;
}

export async function setReviewStatus(
  pool: Pool,
  id: string,
  status: ReviewStatus,
): Promise<void> {
  await pool.query(`update external_reviews set status = $2 where id = $1`, [id, status]);
}
