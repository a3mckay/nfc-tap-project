import type { Pool } from "pg";
import type { ReviewStatus } from "./reviews.js";

export interface Award {
  id: string;
  store_id: string;
  product_id: string;
  title: string;
  awarding_body: string | null;
  year: number | null;
  source_url: string | null;
  source_label: string | null;
  status: ReviewStatus;
  fetched_at: Date;
}

export interface AwardInput {
  store_id: string;
  product_id: string;
  title: string;
  awarding_body: string | null;
  year: number | null;
  source_url: string | null;
  source_label: string | null;
  status?: ReviewStatus;
}

export async function upsertAward(pool: Pool, a: AwardInput): Promise<void> {
  await pool.query(
    `insert into awards
       (store_id, product_id, title, awarding_body, year, source_url, source_label, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (product_id, source_url)
     do update set
       title         = excluded.title,
       awarding_body = excluded.awarding_body,
       year          = excluded.year,
       source_label  = excluded.source_label,
       fetched_at    = now()`,
    [a.store_id, a.product_id, a.title, a.awarding_body, a.year, a.source_url, a.source_label, a.status ?? "approved"],
  );
}

export async function getApprovedAwardsByProduct(
  pool: Pool,
  productId: string,
): Promise<Award[]> {
  const { rows } = await pool.query<Award>(
    `select * from awards where product_id = $1 and status = 'approved'
     order by year desc nulls last, fetched_at desc`,
    [productId],
  );
  return rows;
}

export async function getPendingAwardsByStore(
  pool: Pool,
  storeId: string,
): Promise<Array<Award & { product_title: string | null }>> {
  const { rows } = await pool.query<Award & { product_title: string | null }>(
    `select a.*, p.title as product_title
       from awards a
       join products p on p.id = a.product_id
      where a.store_id = $1 and a.status = 'pending'
      order by a.fetched_at desc`,
    [storeId],
  );
  return rows;
}

export async function getPendingAwardsByProduct(
  pool: Pool,
  productId: string,
): Promise<Award[]> {
  const { rows } = await pool.query<Award>(
    `select * from awards
      where product_id = $1 and status = 'pending'
      order by fetched_at desc`,
    [productId],
  );
  return rows;
}

export async function setAwardStatus(
  pool: Pool,
  id: string,
  status: ReviewStatus,
): Promise<void> {
  await pool.query(`update awards set status = $2 where id = $1`, [id, status]);
}
