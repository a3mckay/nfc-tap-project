import type { Pool } from "pg";
import { randomUUID } from "crypto";

export type TagStatus = "unassigned" | "active" | "disabled" | "oos";

export interface Tag {
  id: string;
  store_id: string;
  tag_uuid: string;
  product_id: string | null;
  status: TagStatus;
  encoded_at: Date | null;
  shipped_at: Date | null;
  deployed_at: Date | null;
}

export interface TagWithProduct extends Tag {
  product_title: string | null;
}

export async function getTagByUuid(pool: Pool, tagUuid: string): Promise<Tag | null> {
  const { rows } = await pool.query<Tag>(
    `select id, store_id, tag_uuid, product_id, status, encoded_at, shipped_at, deployed_at
       from tags where tag_uuid = $1`,
    [tagUuid],
  );
  return rows[0] ?? null;
}

export async function getTagById(pool: Pool, id: string): Promise<Tag | null> {
  const { rows } = await pool.query<Tag>(
    `select id, store_id, tag_uuid, product_id, status, encoded_at, shipped_at, deployed_at
       from tags where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getTagsByStore(
  pool: Pool,
  storeId: string,
): Promise<TagWithProduct[]> {
  const { rows } = await pool.query<TagWithProduct>(
    `select t.id, t.store_id, t.tag_uuid, t.product_id, t.status,
            t.encoded_at, t.shipped_at, t.deployed_at,
            p.title as product_title
       from tags t
       left join products p on p.id = t.product_id
      where t.store_id = $1
      order by t.encoded_at desc nulls last, t.id`,
    [storeId],
  );
  return rows;
}

export async function assignTagToProduct(
  pool: Pool,
  tagId: string,
  productId: string | null,
): Promise<void> {
  const newStatus = productId ? "active" : "unassigned";
  await pool.query(
    `update tags set product_id = $2, status = $3 where id = $1`,
    [tagId, productId, newStatus],
  );
}

export async function setTagStatus(
  pool: Pool,
  tagId: string,
  status: TagStatus,
): Promise<void> {
  await pool.query(`update tags set status = $2 where id = $1`, [tagId, status]);
}

export async function provisionTags(
  pool: Pool,
  storeId: string,
  count: number,
): Promise<Tag[]> {
  const values = Array.from({ length: count }, () => randomUUID());
  const placeholders = values
    .map((_, i) => `($1, $${i + 2}::uuid, 'unassigned')`)
    .join(", ");
  const { rows } = await pool.query<Tag>(
    `insert into tags (store_id, tag_uuid, status)
     values ${placeholders}
     returning id, store_id, tag_uuid, product_id, status,
               encoded_at, shipped_at, deployed_at`,
    [storeId, ...values],
  );
  return rows;
}
