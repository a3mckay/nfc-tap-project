import type { Pool } from "pg";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  tier: string | null;
  website: string | null;
  created_at: Date;
}

export interface CanonicalProduct {
  id: string;
  brand_id: string;
  name_normalized: string;
  product_type: string | null;
  sku_patterns: string[];
  created_at: Date;
}

export interface ProductCanonicalMap {
  id: string;
  store_product_id: string;
  canonical_product_id: string;
  match_method: string;
  confidence_score: number;
  reviewed: boolean;
  created_at: Date;
}

export interface ProductWithCanonicalStatus {
  product_id: string;
  product_title: string;
  vendor: string | null;
  map_id: string | null;
  canonical_product_id: string | null;
  canonical_name: string | null;
  brand_name: string | null;
  confidence_score: number | null;
  reviewed: boolean | null;
}

export async function upsertBrand(
  pool: Pool,
  name: string,
  slug: string,
): Promise<Brand> {
  const { rows } = await pool.query<Brand>(
    `insert into brands (name, slug)
     values ($1, $2)
     on conflict (slug)
     do update set name = excluded.name
     returning *`,
    [name, slug],
  );
  return rows[0]!;
}

export async function upsertCanonicalProduct(
  pool: Pool,
  brandId: string,
  nameNormalized: string,
  productType: string | null,
): Promise<CanonicalProduct> {
  const { rows } = await pool.query<CanonicalProduct>(
    `insert into canonical_products (brand_id, name_normalized, product_type)
     values ($1, $2, $3)
     on conflict (brand_id, name_normalized)
     do update set product_type = coalesce(excluded.product_type, canonical_products.product_type)
     returning *`,
    [brandId, nameNormalized, productType],
  );
  return rows[0]!;
}

export async function upsertProductCanonicalMap(
  pool: Pool,
  storeProductId: string,
  canonicalProductId: string,
  matchMethod: string,
  confidenceScore: number,
  reviewed: boolean,
): Promise<ProductCanonicalMap> {
  const { rows } = await pool.query<ProductCanonicalMap>(
    `insert into product_canonical_map
       (store_product_id, canonical_product_id, match_method, confidence_score, reviewed)
     values ($1, $2, $3, $4, $5)
     on conflict (store_product_id)
     do update set
       canonical_product_id = excluded.canonical_product_id,
       match_method         = excluded.match_method,
       confidence_score     = excluded.confidence_score,
       reviewed             = excluded.reviewed
     returning *`,
    [storeProductId, canonicalProductId, matchMethod, confidenceScore, reviewed],
  );
  return rows[0]!;
}

export async function getUnmatchedProducts(
  pool: Pool,
  storeId: string,
): Promise<Array<{ id: string; title: string; vendor: string | null; product_type: string | null }>> {
  const { rows } = await pool.query(
    `select p.id, p.title, p.vendor, p.product_type
       from products p
       left join product_canonical_map m on m.store_product_id = p.id
      where p.store_id = $1
        and p.status = 'active'
        and m.id is null`,
    [storeId],
  );
  return rows;
}

export async function getProductsWithCanonicalStatus(
  pool: Pool,
  storeId: string,
): Promise<ProductWithCanonicalStatus[]> {
  const { rows } = await pool.query<ProductWithCanonicalStatus>(
    `select p.id as product_id, p.title as product_title, p.vendor,
            m.id as map_id, m.canonical_product_id,
            cp.name_normalized as canonical_name,
            b.name as brand_name,
            m.confidence_score, m.reviewed
       from products p
       left join product_canonical_map m on m.store_product_id = p.id
       left join canonical_products cp on cp.id = m.canonical_product_id
       left join brands b on b.id = cp.brand_id
      where p.store_id = $1
        and p.status = 'active'
      order by m.reviewed nulls first, p.title`,
    [storeId],
  );
  return rows.map((r) => ({
    ...r,
    confidence_score: r.confidence_score !== null ? Number(r.confidence_score) : null,
  }));
}

export async function reviewCanonicalMatch(pool: Pool, mapId: string): Promise<void> {
  await pool.query(
    `update product_canonical_map set reviewed = true where id = $1`,
    [mapId],
  );
}
