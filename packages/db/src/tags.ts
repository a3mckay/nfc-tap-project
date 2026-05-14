import type { Pool } from "pg";
import { randomUUID } from "crypto";

export type TagStatus = "unassigned" | "active" | "disabled" | "oos";

export interface Tag {
  id: string;
  store_id: string;
  tag_uuid: string;
  tag_number: number;
  product_id: string | null;
  status: TagStatus;
  encoded_at: Date | null;
  shipped_at: Date | null;
  deployed_at: Date | null;
}

export interface TagWithProduct extends Tag {
  product_title: string | null;
}

export type TagSortColumn = "number" | "status" | "product";
export type SortDir = "asc" | "desc";

const SORT_COLUMN_MAP: Record<TagSortColumn, string> = {
  number: "t.tag_number",
  status: "t.status",
  product: "p.title",
};

export async function getTagByUuid(pool: Pool, tagUuid: string): Promise<Tag | null> {
  const { rows } = await pool.query<Tag>(
    `select id, store_id, tag_uuid, tag_number, product_id, status, encoded_at, shipped_at, deployed_at
       from tags where tag_uuid = $1`,
    [tagUuid],
  );
  return rows[0] ?? null;
}

export async function getTagById(pool: Pool, id: string): Promise<Tag | null> {
  const { rows } = await pool.query<Tag>(
    `select id, store_id, tag_uuid, tag_number, product_id, status, encoded_at, shipped_at, deployed_at
       from tags where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getTagsByStore(
  pool: Pool,
  storeId: string,
  options: { sort?: TagSortColumn; dir?: SortDir; status?: string } = {},
): Promise<TagWithProduct[]> {
  const { sort = "number", dir = "desc", status } = options;
  const orderCol = SORT_COLUMN_MAP[sort] ?? "t.tag_number";
  const orderDir = dir === "asc" ? "ASC" : "DESC";

  const params: unknown[] = [storeId];
  let statusClause = "";
  if (status) {
    params.push(status);
    statusClause = `and t.status = $${params.length}`;
  }

  const { rows } = await pool.query<TagWithProduct>(
    `select t.id, t.store_id, t.tag_uuid, t.tag_number, t.product_id, t.status,
            t.encoded_at, t.shipped_at, t.deployed_at,
            p.title as product_title
       from tags t
       left join products p on p.id = t.product_id
      where t.store_id = $1
        ${statusClause}
      order by ${orderCol} ${orderDir} nulls last, t.tag_number desc`,
    params,
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
  // Insert one tag at a time so each gets the next sequential tag_number for this store.
  // Using a subquery inside the INSERT avoids race conditions better than a pre-fetched MAX.
  const results: Tag[] = [];
  for (let i = 0; i < count; i++) {
    const tagUuid = randomUUID();
    const { rows } = await pool.query<Tag>(
      `insert into tags (store_id, tag_uuid, status, tag_number)
       values ($1, $2::uuid, 'unassigned',
               coalesce((select max(tag_number) from tags where store_id = $1), 0) + 1)
       returning id, store_id, tag_uuid, tag_number, product_id, status,
                 encoded_at, shipped_at, deployed_at`,
      [storeId, tagUuid],
    );
    if (!rows[0]) throw new Error(`provisionTags: insert returned no row for uuid ${tagUuid}`);
    results.push(rows[0]);
  }
  return results;
}
