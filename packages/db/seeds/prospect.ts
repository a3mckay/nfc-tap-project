/**
 * PRD v4 §7 Step 12: a demo store for one sales prospect, from a config file.
 * Run with: DATABASE_URL=... corepack pnpm --filter @nfc/db seed:prospect seeds/prospects/<slug>.json
 *
 * Owner demos only: no made-up taps, and the store doesn't share data. Safe to
 * re-run: products update, but tags (already written to cards) and the owner's
 * password stay the same. Copy is written afterwards with Generate in the admin,
 * so a person reviews it before a prospect sees it.
 */

import { Pool } from "pg";
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { pathToFileURL } from "url";
import { assignTagToProduct, getTagsByStore, provisionTags } from "../src/tags.js";
import { createStoreAdmin, getStoreAdminByEmail } from "../src/store-admins.js";
import { SPEC_CATEGORIES } from "../src/spec-templates.js";

export interface ProspectProduct {
  title: string;
  vendor?: string;
  productType?: string;
  price?: string;
  imageUrl?: string;
  description?: string;
}

export interface ProspectConfig {
  slug: string;   // e.g. "millers-shoes": the store's key, so re-runs update it
  name: string;   // shown to customers on the tap page
  industry: string;   // a spec category (docs/category-labels.md)
  theme?: { primaryColor?: string; secondaryColor?: string; backgroundColor?: string; fontFamily?: string; logoUrl?: string };
  owner?: { email: string };   // the prospect's dashboard login
  products: ProspectProduct[];
}

export interface ProspectResult {
  storeId: string;
  tags: Array<{ title: string; url: string }>;
  owner: { email: string; created: boolean; password?: string } | null;
}

const fail = (msg: string): never => { throw new Error(`Prospect config: ${msg}`); };
const optionalString = (v: unknown, field: string) => {
  if (v !== undefined && typeof v !== "string") fail(`${field} must be text`);
};

// Checks a config file's contents and says what's wrong, field by field.
export function parseProspect(raw: unknown): ProspectConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  if (typeof c.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug)) fail("slug must be lowercase letters, numbers and dashes, e.g. millers-shoes");
  if (typeof c.name !== "string" || !c.name.trim()) fail("name is required");
  if (typeof c.industry !== "string" || !(SPEC_CATEGORIES as string[]).includes(c.industry)) {
    fail(`industry must be one of: ${SPEC_CATEGORIES.join(", ")}`);
  }
  if (c.theme !== undefined && (typeof c.theme !== "object" || c.theme === null)) fail("theme must be an object");
  for (const [k, v] of Object.entries((c.theme ?? {}) as Record<string, unknown>)) optionalString(v, `theme.${k}`);
  if (c.owner !== undefined) {
    const email = (c.owner as { email?: unknown }).email;
    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("owner.email must be an email address");
  }
  if (!Array.isArray(c.products) || c.products.length === 0) fail("add at least one product");
  (c.products as Array<Record<string, unknown>>).forEach((p, i) => {
    if (typeof p?.title !== "string" || !p.title.trim()) fail(`products[${i}].title is required`);
    for (const k of ["vendor", "productType", "price", "imageUrl", "description"]) optionalString(p[k], `products[${i}].${k}`);
  });
  return raw as ProspectConfig;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const productKey = (title: string) => `prospect-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

export async function seedProspect(pool: Pool, config: ProspectConfig, tapBaseUrl: string): Promise<ProspectResult> {
  const domain = `${config.slug}.prospect.tapshelf.co`;
  const { rows: [store] } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token, platform, name, industry, theme_settings, data_sharing_opted_in)
     values ($1, '', 'other', $2, $3, $4, false)
     on conflict (shopify_shop_domain) do update
       set name = excluded.name, industry = excluded.industry, theme_settings = excluded.theme_settings
     returning id`,
    [domain, config.name, config.industry, JSON.stringify(config.theme ?? {})],
  );
  if (!store) throw new Error("seedProspect: store upsert returned no row");

  const tagByProduct = new Map((await getTagsByStore(pool, store.id)).map((t) => [t.product_id, t]));
  const tags: ProspectResult["tags"] = [];

  for (const p of config.products) {
    const id = productKey(p.title);
    const { rows: [product] } = await pool.query<{ id: string }>(
      `insert into products
         (store_id, shopify_product_id, title, description_html, vendor, product_type,
          images, variants, inventory_quantity, status, shopify_updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 20, 'active', now())
       on conflict (store_id, shopify_product_id) do update
         set title = excluded.title, description_html = excluded.description_html, vendor = excluded.vendor,
             product_type = excluded.product_type, images = excluded.images, variants = excluded.variants`,
      [
        store.id, id, p.title, p.description ? `<p>${escapeHtml(p.description)}</p>` : null, p.vendor ?? null, p.productType ?? null,
        JSON.stringify(p.imageUrl ? [{ url: p.imageUrl, altText: p.title }] : []),
        JSON.stringify(p.price ? [{ id, sku: null, price: p.price, inventoryQuantity: 20 }] : []),
      ],
    ).then(async (r) => r.rows[0]
      ? r
      : pool.query<{ id: string }>(`select id from products where store_id = $1 and shopify_product_id = $2`, [store.id, id]));
    if (!product) throw new Error(`seedProspect: no product row for ${p.title}`);

    let tag = tagByProduct.get(product.id);
    if (!tag) {
      const [fresh] = await provisionTags(pool, store.id, 1);
      if (!fresh) throw new Error(`seedProspect: no tag for ${p.title}`);
      await assignTagToProduct(pool, fresh.id, store.id, product.id);
      tag = { ...fresh, product_id: product.id } as typeof tag & object;
    }
    tags.push({ title: p.title, url: `${tapBaseUrl.replace(/\/+$/, "")}/p/${tag!.tag_uuid}` });
  }

  let owner: ProspectResult["owner"] = null;
  if (config.owner) {
    const existing = await getStoreAdminByEmail(pool, config.owner.email);
    if (existing && existing.store_id !== store.id) throw new Error(`${config.owner.email} already signs in to another store`);
    if (existing) {
      owner = { email: config.owner.email, created: false };
    } else {
      const password = randomBytes(12).toString("base64url");
      await createStoreAdmin(pool, store.id, config.owner.email, password);
      owner = { email: config.owner.email, created: true, password };
    }
  }

  return { storeId: store.id, tags, owner };
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: seed:prospect seeds/prospects/<slug>.json");
  const config = parseProspect(JSON.parse(readFileSync(file, "utf8")));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await seedProspect(pool, config, process.env.TAP_PAGE_URL ?? "https://tapshelf.store");
    const csv = ["product,url", ...result.tags.map((t) => `"${t.title.replace(/"/g, '""')}",${t.url}`)].join("\n");
    const csvFile = file.replace(/\.json$/, ".tags.csv");
    writeFileSync(csvFile, `${csv}\n`);

    console.log(`\n${config.name} — demo store ready`);
    console.log(`Admin: https://admin.tapshelf.co/?shop=${config.slug}.prospect.tapshelf.co`);
    if (result.owner?.created) console.log(`Owner login: ${result.owner.email} / ${result.owner.password}  (shown once; put it in the kit)`);
    else if (result.owner) console.log(`Owner login: ${result.owner.email} (already set up; password unchanged)`);
    console.log(`\nWrite these to the tags (also saved to ${csvFile}):`);
    for (const t of result.tags) console.log(`  ${t.title}: ${t.url}`);
    console.log(`\nNext: open each product in the admin, click Generate, and review the copy.`);
  } finally {
    await pool.end();
  }
}

// Run only when executed directly, not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
}
