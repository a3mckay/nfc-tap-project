import type { Pool } from "pg";
import type { FactSourceKind } from "./product-facts.js";

// PRD v4 §7 Step 15l: spec values per product (D51). Research fills empty or
// unedited values with a source; owner and manager edits always win.

export interface ProductSpec {
  key: string;
  value: string;
  source_url: string | null;
  source_kind: FactSourceKind;
  owner_edited: boolean;
}

export async function getProductSpecs(pool: Pool, storeId: string, productId: string): Promise<ProductSpec[]> {
  const { rows } = await pool.query<ProductSpec>(
    `select spec_key as key, value, source_url, source_kind, owner_edited from product_specs
      where store_id = $1 and product_id = $2 order by spec_key`,
    [storeId, productId],
  );
  return rows;
}

export async function saveResearchedSpecs(
  pool: Pool,
  storeId: string,
  productId: string,
  specs: Array<{ key: string; value: string; source_url: string | null; source_kind: Exclude<FactSourceKind, "owner"> }>,
): Promise<void> {
  for (const s of specs) {
    const value = s.value.trim();
    if (!value) continue;
    await pool.query(
      `insert into product_specs (store_id, product_id, spec_key, value, source_url, source_kind)
       select p.store_id, p.id, $3, $4, $5, $6 from products p where p.id = $2 and p.store_id = $1
       on conflict (product_id, spec_key) do update
         set value = excluded.value, source_url = excluded.source_url, source_kind = excluded.source_kind, updated_at = now()
         where not product_specs.owner_edited`,
      [storeId, productId, s.key, value.slice(0, 300), s.source_url, s.source_kind],
    );
  }
}

// Saves the owner's values; a blank value clears that spec.
export async function saveOwnerSpecs(pool: Pool, storeId: string, productId: string, values: Record<string, string>): Promise<void> {
  for (const [key, raw] of Object.entries(values)) {
    const value = (raw ?? "").trim();
    if (value) {
      await pool.query(
        `insert into product_specs (store_id, product_id, spec_key, value, source_kind, owner_edited)
         select p.store_id, p.id, $3, $4, 'owner', true from products p where p.id = $2 and p.store_id = $1
         on conflict (product_id, spec_key) do update
           set value = excluded.value, source_url = null, source_kind = 'owner', owner_edited = true, updated_at = now()
           where product_specs.store_id = $1`,
        [storeId, productId, key, value.slice(0, 300)],
      );
    } else {
      await pool.query(`delete from product_specs where store_id = $1 and product_id = $2 and spec_key = $3`, [storeId, productId, key]);
    }
  }
}

export interface SpecSetup { storeIndustry: string | null; override: string | null; productType: string | null; title: string }

export async function getSpecSetup(pool: Pool, storeId: string, productId: string): Promise<SpecSetup | null> {
  const { rows } = await pool.query<SpecSetup>(
    `select s.industry as "storeIndustry", p.spec_category as override, p.product_type as "productType", p.title
       from products p join stores s on s.id = p.store_id where p.id = $2 and p.store_id = $1`,
    [storeId, productId],
  );
  return rows[0] ?? null;
}

export async function setStoreIndustry(pool: Pool, storeId: string, industry: string | null): Promise<void> {
  await pool.query(`update stores set industry = $2 where id = $1`, [storeId, industry]);
}

export async function setProductSpecCategory(pool: Pool, storeId: string, productId: string, category: string | null): Promise<void> {
  await pool.query(`update products set spec_category = $3 where id = $2 and store_id = $1`, [storeId, productId, category]);
}
