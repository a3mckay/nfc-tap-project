import type { Pool } from "pg";

export interface ProductInput {
  store_id: string;
  shopify_product_id: string;
  title: string;
  description_html: string | null;
  vendor: string | null;
  product_type: string | null;
  images: unknown;
  variants: unknown;
  inventory_quantity: number;
  status: string;
  shopify_updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  shopify_product_id: string | null;
  title: string;
  description_html: string | null;
  vendor: string | null;
  product_type: string | null;
  images: unknown;
  variants: unknown;
  inventory_quantity: number;
  status: string;
  shopify_updated_at: Date | null;
  is_manual: boolean;
  deleted_at: Date | null;
}

export async function upsertProduct(
  pool: Pool,
  product: ProductInput,
): Promise<void> {
  // ON CONFLICT: only update Shopify-owned fields; never touch is_manual products or deleted_at
  await pool.query(
    `insert into products
       (store_id, shopify_product_id, title, description_html, vendor,
        product_type, images, variants, inventory_quantity, status, shopify_updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (store_id, shopify_product_id)
     do update set
       title               = excluded.title,
       description_html    = excluded.description_html,
       vendor              = excluded.vendor,
       product_type        = excluded.product_type,
       images              = excluded.images,
       variants            = excluded.variants,
       inventory_quantity  = excluded.inventory_quantity,
       status              = excluded.status,
       shopify_updated_at  = excluded.shopify_updated_at,
       deleted_at          = null
     where products.is_manual = false`,
    [
      product.store_id,
      product.shopify_product_id,
      product.title,
      product.description_html,
      product.vendor,
      product.product_type,
      JSON.stringify(product.images),
      JSON.stringify(product.variants),
      product.inventory_quantity,
      product.status,
      product.shopify_updated_at,
    ],
  );
}

export async function insertManualProduct(
  pool: Pool,
  storeId: string,
  title: string,
  vendor: string | null,
  productType: string | null,
): Promise<Product> {
  const { rows } = await pool.query<Product>(
    `insert into products
       (store_id, title, vendor, product_type, status, is_manual)
     values ($1, $2, $3, $4, 'active', true)
     returning *`,
    [storeId, title, vendor, productType],
  );
  if (!rows[0]) throw new Error("insertManualProduct returned no row");
  return rows[0];
}

// Returns the shopify_product_id values for all non-manual, non-deleted products in a store.
// Used by sync to detect removals.
export async function getShopifyProductIds(
  pool: Pool,
  storeId: string,
): Promise<string[]> {
  const { rows } = await pool.query<{ shopify_product_id: string }>(
    `select shopify_product_id from products
      where store_id = $1 and is_manual = false and deleted_at is null
        and shopify_product_id is not null`,
    [storeId],
  );
  return rows.map((r) => r.shopify_product_id);
}

// Soft-delete: keeps enrichment data intact. Used when a product is removed from Shopify
// but has enrichment data worth preserving.
export async function softDeleteProduct(
  pool: Pool,
  storeId: string,
  shopifyProductId: string,
): Promise<void> {
  await pool.query(
    `update products set deleted_at = now(), status = 'archived'
      where store_id = $1 and shopify_product_id = $2 and is_manual = false`,
    [storeId, shopifyProductId],
  );
}

export async function getProductById(pool: Pool, id: string): Promise<Product | null> {
  const { rows } = await pool.query<Product>(
    `select * from products where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// Called by Shopify product/delete webhook. Soft-deletes if enrichment exists, hard-deletes otherwise.
export async function deleteProductByShopifyId(
  pool: Pool,
  storeId: string,
  shopifyProductId: string,
): Promise<void> {
  // Soft-delete products that have enrichment data (preserve the work)
  await pool.query(
    `update products p set deleted_at = now(), status = 'archived'
      where p.store_id = $1 and p.shopify_product_id = $2 and p.is_manual = false
        and exists (select 1 from enrichments e where e.product_id = p.id)`,
    [storeId, shopifyProductId],
  );
  // Hard-delete the rest (no enrichment = nothing to preserve)
  await pool.query(
    `delete from products
      where store_id = $1 and shopify_product_id = $2 and is_manual = false and deleted_at is null`,
    [storeId, shopifyProductId],
  );
}

export interface ProductWithStatus {
  id: string;
  title: string;
  vendor: string | null;
  status: string;
  is_manual: boolean;
  is_archived: boolean;
  enrichment_id: string | null;
  ai_generated: boolean | null;
  active_tag_count: string;
  total_tag_count: string;
  active_tag_uuid: string | null;
  active_tag_id: string | null;
  canonical_map_id: string | null;
  canonical_reviewed: boolean | null;
  canonical_confidence: string | null;
  inventory_quantity: number;
}

export async function getProductsWithStatus(
  pool: Pool,
  storeId: string,
  includeDeleted = false,
): Promise<ProductWithStatus[]> {
  const { rows } = await pool.query<ProductWithStatus>(
    `select
       p.id, p.title, p.vendor, p.status, p.is_manual,
       p.deleted_at is not null                               as is_archived,
       p.inventory_quantity,
       e.id                                                   as enrichment_id,
       e.ai_generated,
       count(t.id) filter (where t.status = 'active')        as active_tag_count,
       count(t.id)                                            as total_tag_count,
       min(t.tag_uuid::text) filter (where t.status = 'active') as active_tag_uuid,
       min(t.id::text)       filter (where t.status = 'active') as active_tag_id,
       pcm.id                                                 as canonical_map_id,
       pcm.reviewed                                           as canonical_reviewed,
       pcm.confidence_score                                   as canonical_confidence
     from products p
     left join enrichments e           on e.product_id = p.id
     left join tags t                  on t.product_id = p.id
     left join product_canonical_map pcm on pcm.store_product_id = p.id
     where p.store_id = $1
       and ($2 or p.deleted_at is null)
     group by p.id, p.title, p.vendor, p.status, p.is_manual, p.deleted_at,
              e.id, e.ai_generated,
              pcm.id, pcm.reviewed, pcm.confidence_score
     order by p.deleted_at is not null, p.title`,
    [storeId, includeDeleted],
  );
  return rows;
}

export async function updateInventoryByShopifyId(
  pool: Pool,
  storeId: string,
  shopifyProductId: string,
  quantity: number,
): Promise<void> {
  await pool.query(
    `update products set inventory_quantity = $3
      where store_id = $1 and shopify_product_id = $2`,
    [storeId, shopifyProductId, quantity],
  );
}
