/**
 * Demo kit seed — creates a realistic demo store for sales use.
 * Run with: DATABASE_URL=... corepack pnpm --filter @nfc/db seed:demo
 * Safe to run multiple times: rows are upserted, and a product that already
 * has a tag keeps it (no new tag or tap events on re-run).
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";
import { pathToFileURL } from "url";
import { assignTagToProduct, getTagsByStore, provisionTags } from "../src/tags.js";

const SHOP_DOMAIN = "demo-store.myshopify.com";

export const DEMO_PRODUCTS = [
  {
    title: "Merino Wool Crewneck",
    vendor: "Finisterre",
    product_type: "Knitwear",
    description_html: "<p>Crafted from Zque-certified merino wool, this crewneck is as kind to the environment as it is to your skin.</p>",
    price: "149.00",
    backstory: "Founded in Cornwall, Finisterre set out to make kit for cold-water surfers who needed warmth without bulk. This crewneck carries that same philosophy — warm, breathable, and built to last.",
    fit_notes: "True to size. Relaxed through the chest and shoulders.",
    materials: "100% Zque-certified merino wool.",
    reasons_to_buy: ["Ethically sourced merino", "Warm yet breathable", "Lifetime repair guarantee", "Zque certified"],
  },
  {
    title: "Canvas Tote Bag",
    vendor: "Ally Capellino",
    product_type: "Bags",
    description_html: "<p>Heavy-duty waxed canvas tote with leather handles. Made in the UK.</p>",
    price: "95.00",
    backstory: "Ally Capellino has been making bags in London since 1980. Each piece is designed to age beautifully and last a lifetime.",
    fit_notes: null,
    materials: "Waxed cotton canvas, vegetable-tanned leather handles.",
    reasons_to_buy: ["Made in the UK", "Waxed canvas weathers beautifully", "Vegetable-tanned leather"],
  },
  {
    title: "Recycled Nylon Puffer",
    vendor: "Patagonia",
    product_type: "Outerwear",
    description_html: "<p>Lightweight puffer insulated with 100% recycled down and shell made from recycled nylon.</p>",
    price: "299.00",
    backstory: "Patagonia has been leading the way on environmental responsibility since 1973. This puffer uses recycled materials without compromising on warmth.",
    fit_notes: "Slim fit. Size up if layering over chunky knits.",
    materials: "100% recycled nylon shell, 100% recycled down fill.",
    reasons_to_buy: ["100% recycled materials", "Packable to fist size", "Lifetime Ironclad Guarantee"],
  },
];

export async function seedDemo(
  pool: Pool,
  shopDomain: string = SHOP_DOMAIN,
): Promise<{ storeId: string }> {
  // 1. Store
  const { rows: [store] } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token, data_sharing_opted_in)
     values ($1, 'demo-token', true)
     on conflict (shopify_shop_domain)
     do update set shopify_access_token = 'demo-token'
     returning id`,
    [shopDomain],
  );
  if (!store) throw new Error("seedDemo: store upsert returned no row");
  console.log(`Store: ${store.id}`);

  const taggedProductIds = new Set(
    (await getTagsByStore(pool, store.id)).map((t) => t.product_id),
  );

  // 2. Products, enrichments, tags
  for (const p of DEMO_PRODUCTS) {
    const shopifyId = `demo-${p.title.toLowerCase().replace(/\s+/g, "-")}`;
    const { rows: [product] } = await pool.query<{ id: string }>(
      `insert into products
         (store_id, shopify_product_id, title, description_html, vendor, product_type,
          images, variants, inventory_quantity, status, shopify_updated_at)
       values ($1, $2, $3, $4, $5, $6, '[]', $7, 20, 'active', now())
       on conflict (store_id, shopify_product_id)
       do update set title = excluded.title
       returning id`,
      [store.id, shopifyId, p.title, p.description_html, p.vendor, p.product_type,
       JSON.stringify([{ id: shopifyId, sku: null, price: p.price, inventoryQuantity: 20 }])],
    );
    if (!product) throw new Error(`seedDemo: product upsert returned no row for ${p.title}`);

    await pool.query(
      `insert into enrichments
         (product_id, backstory, fit_notes, materials, reasons_to_buy, ai_generated)
       values ($1, $2, $3, $4, $5, true)
       on conflict (product_id)
       do update set backstory = excluded.backstory`,
      [product.id, p.backstory, p.fit_notes, p.materials, JSON.stringify(p.reasons_to_buy)],
    );

    // One active tag per product, numbered by provisionTags
    if (taggedProductIds.has(product.id)) {
      console.log(`  ${p.title}: already tagged, skipped`);
      continue;
    }
    const [tag] = await provisionTags(pool, store.id, 1);
    if (!tag) throw new Error(`seedDemo: provisionTags returned no tag for ${p.title}`);
    await assignTagToProduct(pool, tag.id, store.id, product.id);

    // Seed some tap events over the past 14 days
    const tapCount = Math.floor(Math.random() * 30) + 10;
    for (let i = 0; i < tapCount; i++) {
      const daysAgo = Math.floor(Math.random() * 14);
      const deviceTypes = ["mobile", "mobile", "mobile", "tablet", "desktop"];
      const device = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      await pool.query(
        `insert into tap_events (tag_id, product_id, store_id, session_id, timestamp, device_type)
         values ($1, $2, $3, $4, now() - ($5 || ' days')::interval - (random() * interval '20 hours'), $6)`,
        [tag.id, product.id, store.id, randomUUID(), daysAgo, device],
      );
    }
    console.log(`  ${p.title}: tag #${tag.tag_number} — ${tapCount} tap events`);
  }

  return { storeId: store.id };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Seeding demo store…");
    await seedDemo(pool);
    console.log(`\nDemo store ready: ?shop=${SHOP_DOMAIN}`);
  } finally {
    await pool.end();
  }
}

// Run only when executed directly (tsx seeds/demo.ts), not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
