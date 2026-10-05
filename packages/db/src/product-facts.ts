import type { Pool } from "pg";

// PRD v4 §7 Step 15b: the research fact sheet (docs/PRD-ai-assistant.md §6.2,
// D42). Facts the AI research tool found, each with its source; owners and
// managers can edit them, and their edits survive regeneration.

export type FactSourceKind = "brand" | "retailer" | "review" | "other" | "owner";

export interface ResearchedFact {
  topic: string;
  fact: string;
  source_url: string | null;
  source_kind: Exclude<FactSourceKind, "owner">;
}

export interface ProductFact {
  id: string;
  store_id: string;
  product_id: string;
  topic: string;
  fact: string;
  source_url: string | null;
  source_kind: FactSourceKind;
  owner_edited: boolean;
  created_at: Date;
  updated_at: Date;
}

// Most trusted sources first (D42), then by topic.
export async function getProductFacts(pool: Pool, storeId: string, productId: string): Promise<ProductFact[]> {
  const { rows } = await pool.query<ProductFact>(
    `select * from product_facts
      where store_id = $1 and product_id = $2
      order by case source_kind when 'owner' then 0 when 'brand' then 1 when 'retailer' then 2
                                when 'review' then 3 else 4 end,
               topic, created_at`,
    [storeId, productId],
  );
  return rows;
}

// Swaps in a new research run: drops facts the owner hasn't touched, keeps the
// rest. False if the product isn't the store's.
export async function replaceResearchedFacts(
  pool: Pool,
  storeId: string,
  productId: string,
  facts: ResearchedFact[],
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rowCount } = await client.query(
      `select 1 from products where id = $1 and store_id = $2 for update`,
      [productId, storeId],
    );
    if (!rowCount) {
      await client.query("rollback");
      return false;
    }
    await client.query(
      `delete from product_facts where store_id = $1 and product_id = $2 and not owner_edited`,
      [storeId, productId],
    );
    for (const f of facts) {
      await client.query(
        `insert into product_facts (store_id, product_id, topic, fact, source_url, source_kind)
         values ($1, $2, $3, $4, $5, $6)`,
        [storeId, productId, f.topic, f.fact, f.source_url, f.source_kind],
      );
    }
    await client.query("commit");
    return true;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateFact(
  pool: Pool,
  storeId: string,
  factId: string,
  edit: { topic: string; fact: string },
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update product_facts set topic = $3, fact = $4, owner_edited = true, updated_at = now()
      where id = $1 and store_id = $2`,
    [factId, storeId, edit.topic, edit.fact],
  );
  return (rowCount ?? 0) > 0;
}

export async function addOwnerFact(
  pool: Pool,
  storeId: string,
  productId: string,
  f: { topic: string; fact: string },
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `insert into product_facts (store_id, product_id, topic, fact, source_kind, owner_edited)
     select p.store_id, p.id, $3, $4, 'owner', true from products p where p.id = $2 and p.store_id = $1`,
    [storeId, productId, f.topic, f.fact],
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteFact(pool: Pool, storeId: string, factId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `delete from product_facts where id = $1 and store_id = $2`,
    [factId, storeId],
  );
  return (rowCount ?? 0) > 0;
}

// ── Brand websites ─────────────────────────────────────────────────────────

export interface BrandWebsite {
  website: string;
  confirmed: boolean;
}

const vendorKey = (vendor: string) => vendor.trim().toLowerCase();

// The store's own setting, else the shared brands list (by name), else null.
export async function getBrandWebsite(pool: Pool, storeId: string, vendor: string): Promise<BrandWebsite | null> {
  const { rows } = await pool.query<BrandWebsite>(
    `select website, confirmed from (
       select website, confirmed, 0 as rank from store_brand_websites where store_id = $1 and vendor_key = $2
       union all
       select website, false, 1 from brands where lower(trim(name)) = $2 and website is not null
     ) w order by rank limit 1`,
    [storeId, vendorKey(vendor)],
  );
  return rows[0] ?? null;
}

export async function setBrandWebsite(
  pool: Pool,
  storeId: string,
  vendor: string,
  website: string,
  confirmed: boolean,
): Promise<void> {
  await pool.query(
    `insert into store_brand_websites (store_id, vendor_key, website, confirmed)
     values ($1, $2, $3, $4)
     on conflict (store_id, vendor_key) do update
       set website = excluded.website, confirmed = excluded.confirmed, updated_at = now()`,
    [storeId, vendorKey(vendor), website, confirmed],
  );
}
