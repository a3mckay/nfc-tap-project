"use server";

import {
  getPool, getStoreByDomain,
  upsertProduct, getShopifyProductIds, softDeleteProduct,
  insertManualProduct, setProductInventoryManual,
} from "@nfc/db";
import { revalidatePath } from "next/cache";

interface ShopifyProduct {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  body_html: string | null;
  status: string;
  updated_at: string;
  images: unknown[];
  variants: Array<{ id: number; price: string; inventory_quantity: number }>;
}

export interface SyncResult {
  added: number;
  updated: number;
  archived: number;
  error?: string;
}

export async function syncProductsAction(shop: string): Promise<SyncResult> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { added: 0, updated: 0, archived: 0, error: "Store not found" };
  if (!store.shopify_access_token) return { added: 0, updated: 0, archived: 0, error: "No Shopify access token" };

  // Fetch all products from Shopify (paginating via Link header)
  const allProducts: ShopifyProduct[] = [];
  let nextUrl: string | null =
    `https://${shop}/admin/api/2024-01/products.json?limit=250&fields=id,title,vendor,product_type,body_html,status,updated_at,images,variants`;

  while (nextUrl) {
    const pageRes = await fetch(nextUrl, {
      headers: { "X-Shopify-Access-Token": store.shopify_access_token },
      signal: AbortSignal.timeout(30_000),
    });
    if (!pageRes.ok) {
      return { added: 0, updated: 0, archived: 0, error: `Shopify API error ${pageRes.status}` };
    }
    const data = await pageRes.json() as { products: ShopifyProduct[] };
    allProducts.push(...data.products);

    const linkHeader: string = pageRes.headers.get("link") ?? "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = nextMatch?.[1] ?? null;
  }

  // Get IDs currently in our DB so we can detect removals
  const existingIds = new Set(await getShopifyProductIds(pool, store.id));
  const shopifyIds = new Set(allProducts.map((p) => String(p.id)));

  let added = 0;
  let updated = 0;

  for (const p of allProducts) {
    const shopifyId = String(p.id);
    const isNew = !existingIds.has(shopifyId);
    await upsertProduct(pool, {
      store_id: store.id,
      shopify_product_id: shopifyId,
      title: p.title,
      description_html: p.body_html,
      vendor: p.vendor || null,
      product_type: p.product_type || null,
      images: p.images,
      variants: p.variants,
      inventory_quantity: p.variants.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0),
      status: p.status,
      shopify_updated_at: p.updated_at,
    });
    if (isNew) added++; else updated++;
  }

  // Soft-delete products removed from Shopify (preserves enrichment data)
  const removed = [...existingIds].filter((id) => !shopifyIds.has(id));
  for (const shopifyId of removed) {
    await softDeleteProduct(pool, store.id, shopifyId);
  }

  revalidatePath("/products");
  return { added, updated, archived: removed.length };
}

export async function addManualProductAction(
  shop: string,
  title: string,
  vendor: string,
  productType: string,
): Promise<{ productId?: string; error?: string }> {
  if (!title.trim()) return { error: "Title is required" };

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };

  const product = await insertManualProduct(
    pool,
    store.id,
    title.trim(),
    vendor.trim() || null,
    productType.trim() || null,
  );

  revalidatePath("/products");
  return { productId: product.id };
}

export async function setInventoryAction(
  shop: string,
  productId: string,
  quantity: number,
): Promise<{ error?: string }> {
  if (!Number.isInteger(quantity) || quantity < 0) return { error: "Invalid quantity" };

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };

  await setProductInventoryManual(pool, productId, store.id, quantity);
  revalidatePath("/products");
  return {};
}
