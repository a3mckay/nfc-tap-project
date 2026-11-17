import type { Pool } from "pg";
import type { FactSourceKind } from "./product-facts.js";
import { specCategoryFor, type SpecCategory } from "./spec-templates.js";

// "Goes great with" (founder, 2026-11-16): up to three of the store's own live
// products that a product needs or suits, each with a reason from a source on
// the product's fact sheet. The AI picks them; the owner can remove one.

export const MAX_PAIRINGS = 3;

// Cannabis and alcohol aren't paired either way: promotion rules (Cannabis Act;
// alcohol marketing never encourages buying or drinking more).
const NO_PAIRINGS: ReadonlySet<string> = new Set(["cannabis", "wine", "beer", "spirits"]);
export const canPair = (category: SpecCategory) => !NO_PAIRINGS.has(category);

export interface NewPairing {
  paired_product_id: string;
  reason: string;
  source_url: string | null;
  source_kind: FactSourceKind;
}

export interface Pairing {
  product_id: string;   // the paired product
  title: string;
  image_url: string | null;
  tag_uuid: string | null;   // null when it has no active tag: shown, but not linked
  reason: string;
  source_url: string | null;
  source_kind: FactSourceKind;
}

const LIVE = `p.deleted_at is null and p.status = 'active'`;

// Swaps in a new AI run. Pairings the owner removed stay removed; only the
// store's own live products count, never the product itself; at most three.
export async function replacePairings(pool: Pool, storeId: string, productId: string, pairings: NewPairing[]): Promise<void> {
  await pool.query(
    `delete from product_pairings where store_id = $1 and product_id = $2 and not removed_by_owner`,
    [storeId, productId],
  );
  const { rows: removed } = await pool.query<{ paired_product_id: string }>(
    `select paired_product_id from product_pairings where store_id = $1 and product_id = $2`,
    [storeId, productId],
  );
  const skip = new Set([productId, ...removed.map((r) => r.paired_product_id)]);
  let position = 0;
  for (const p of pairings) {
    if (position >= MAX_PAIRINGS || skip.has(p.paired_product_id)) continue;
    const { rowCount } = await pool.query(
      `insert into product_pairings (store_id, product_id, paired_product_id, reason, source_url, source_kind, position)
       select $1, $2, p.id, $4, $5, $6, $7 from products p
        where p.id = $3 and p.store_id = $1 and ${LIVE}
          and exists (select 1 from products own where own.id = $2 and own.store_id = $1)
       on conflict (product_id, paired_product_id) do nothing`,
      [storeId, productId, p.paired_product_id, p.reason.trim().slice(0, 200), p.source_url, p.source_kind, position],
    );
    if (rowCount) {
      skip.add(p.paired_product_id);
      position++;
    }
  }
}

// The pairings to show, in the AI's order, for live products only.
export async function getPairings(pool: Pool, storeId: string, productId: string): Promise<Pairing[]> {
  const { rows } = await pool.query<Pairing>(
    `select p.id as product_id, p.title, (p.images->0->>'url') as image_url,
            (select t.tag_uuid::text from tags t where t.product_id = p.id and t.status = 'active' limit 1) as tag_uuid,
            pp.reason, pp.source_url, pp.source_kind
       from product_pairings pp join products p on p.id = pp.paired_product_id
      where pp.store_id = $1 and pp.product_id = $2 and not pp.removed_by_owner and ${LIVE}
      order by pp.position`,
    [storeId, productId],
  );
  return rows;
}

// The owner takes a pairing off the product; it stays off after a new AI run.
export async function removePairing(pool: Pool, storeId: string, productId: string, pairedProductId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update product_pairings set removed_by_owner = true
      where store_id = $1 and product_id = $2 and paired_product_id = $3`,
    [storeId, productId, pairedProductId],
  );
  return (rowCount ?? 0) > 0;
}

export interface CatalogItem {
  id: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
  category: SpecCategory;
  description: string;
}

// The store's other live products the AI may pair with, with a short plain-text description.
export async function getPairingCatalog(pool: Pool, storeId: string, excludeProductId: string, limit = 200): Promise<CatalogItem[]> {
  const { rows } = await pool.query<{ id: string; title: string; vendor: string | null; product_type: string | null; spec_category: string | null; description_html: string | null; industry: string | null }>(
    `select p.id, p.title, p.vendor, p.product_type, p.spec_category, p.description_html, s.industry
       from products p join stores s on s.id = p.store_id
      where p.store_id = $1 and p.id <> $2 and ${LIVE}
      order by p.title
      limit $3`,
    [storeId, excludeProductId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    vendor: r.vendor,
    product_type: r.product_type,
    category: specCategoryFor({ productType: r.product_type, title: r.title, override: r.spec_category, storeIndustry: r.industry }),
    description: (r.description_html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160),
  }));
}
