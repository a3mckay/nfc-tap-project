/**
 * Demo kit seed — creates a realistic demo store for sales use.
 * Run with: DATABASE_URL=... npx tsx packages/db/seeds/demo.ts
 * Safe to run multiple times (uses on-conflict upserts throughout).
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SHOP_DOMAIN = "demo-store.myshopify.com";

const DEMO_PRODUCTS = [
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

async function main() {
  console.log("Seeding demo store…");

  // 1. Store
  const { rows: [store] } = await pool.query(
    `insert into stores (shopify_shop_domain, shopify_access_token, data_sharing_opted_in)
     values ($1, 'demo-token', true)
     on conflict (shopify_shop_domain)
     do update set shopify_access_token = 'demo-token'
     returning *`,
    [SHOP_DOMAIN],
  );
  console.log(`Store: ${store.id}`);

  // 2. Products, enrichments, tags
  for (const p of DEMO_PRODUCTS) {
    const shopifyId = `demo-${p.title.toLowerCase().replace(/\s+/g, "-")}`;
    const { rows: [product] } = await pool.query(
      `insert into products
         (store_id, shopify_product_id, title, description_html, vendor, product_type,
          images, variants, inventory_quantity, status, shopify_updated_at)
       values ($1, $2, $3, $4, $5, $6, '[]', $7, 20, 'active', now())
       on conflict (store_id, shopify_product_id)
       do update set title = excluded.title
       returning *`,
      [store.id, shopifyId, p.title, p.description_html, p.vendor, p.product_type,
       JSON.stringify([{ id: shopifyId, sku: null, price: p.price, inventoryQuantity: 20 }])],
    );

    await pool.query(
      `insert into enrichments
         (product_id, backstory, fit_notes, materials, reasons_to_buy, ai_generated)
       values ($1, $2, $3, $4, $5, true)
       on conflict (product_id)
       do update set backstory = excluded.backstory`,
      [product.id, p.backstory, p.fit_notes, p.materials, JSON.stringify(p.reasons_to_buy)],
    );

    // One active tag per product
    const tagUuid = randomUUID();
    const { rows: [tag] } = await pool.query(
      `insert into tags (store_id, tag_uuid, product_id, status)
       values ($1, $2, $3, 'active')
       on conflict do nothing
       returning *`,
      [store.id, tagUuid, product.id],
    );

    if (tag) {
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
      console.log(`  ${p.title}: tag ${tagUuid.slice(0, 8)}… — ${tapCount} tap events`);
    }
  }

  console.log(`\nDemo store ready: ?shop=${SHOP_DOMAIN}`);
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
