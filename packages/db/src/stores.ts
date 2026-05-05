import type { Pool } from "pg";

export type StoreTier     = "free" | "starter" | "pro" | "enterprise";
export type StorePlatform = "shopify" | "woocommerce" | "squarespace" | "other";

export interface Store {
  id: string;
  shopify_shop_domain: string;
  shopify_access_token: string;
  theme_settings: Record<string, unknown>;
  created_at: Date;
  data_sharing_opted_in: boolean;
  store_city: string | null;
  store_neighborhood: string | null;
  store_lat: number | null;
  store_lng: number | null;
  tier: StoreTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  tier_expires_at: Date | null;
  platform: StorePlatform;
}

export async function upsertStore(
  pool: Pool,
  domain: string,
  accessToken: string,
): Promise<Store> {
  const { rows } = await pool.query<Store>(
    `insert into stores (shopify_shop_domain, shopify_access_token)
     values ($1, $2)
     on conflict (shopify_shop_domain)
     do update set shopify_access_token = excluded.shopify_access_token
     returning *`,
    [domain, accessToken],
  );
  if (!rows[0]) throw new Error("upsertStore returned no row");
  return rows[0];
}

export async function updateThemeSettings(
  pool: Pool,
  storeId: string,
  themeSettings: Record<string, unknown>,
): Promise<void> {
  await pool.query(
    `update stores set theme_settings = $2 where id = $1`,
    [storeId, JSON.stringify(themeSettings)],
  );
}

export async function getStoreById(
  pool: Pool,
  id: string,
): Promise<Store | null> {
  const { rows } = await pool.query<Store>(
    `select * from stores where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function updateStoreTier(
  pool: Pool,
  storeId: string,
  tier: StoreTier,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  tierExpiresAt: Date | null,
): Promise<void> {
  await pool.query(
    `update stores
        set tier                    = $2,
            stripe_customer_id      = $3,
            stripe_subscription_id  = $4,
            tier_expires_at         = $5
      where id = $1`,
    [storeId, tier, stripeCustomerId, stripeSubscriptionId, tierExpiresAt],
  );
}

export async function setDataSharingConsent(
  pool: Pool,
  storeId: string,
  optedIn: boolean,
): Promise<void> {
  await pool.query(
    `update stores set data_sharing_opted_in = $2 where id = $1`,
    [storeId, optedIn],
  );
}

export async function getStoreByDomain(
  pool: Pool,
  domain: string,
): Promise<Store | null> {
  const { rows } = await pool.query<Store>(
    `select * from stores where shopify_shop_domain = $1`,
    [domain],
  );
  return rows[0] ?? null;
}

export async function getAllStores(pool: Pool): Promise<Store[]> {
  const { rows } = await pool.query<Store>(
    `select * from stores order by created_at desc`,
  );
  return rows;
}

export async function createManualStore(
  pool: Pool,
  domain: string,
  platform: StorePlatform,
): Promise<Store> {
  const { rows } = await pool.query<Store>(
    `insert into stores (shopify_shop_domain, shopify_access_token, platform)
     values ($1, '', $2)
     on conflict (shopify_shop_domain) do update
       set platform = excluded.platform
     returning *`,
    [domain, platform],
  );
  if (!rows[0]) throw new Error("createManualStore returned no row");
  return rows[0];
}

export async function saveBrandDetectUrl(
  pool: Pool,
  storeId: string,
  url: string,
): Promise<void> {
  await pool.query(
    `update stores set brand_detect_url = $2, brand_checked_at = now() where id = $1`,
    [storeId, url],
  );
}

export interface BrandPendingSuggestion {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  font: string;
  description: string;
  detected_at: string;
}

export async function storePendingBrandSuggestion(
  pool: Pool,
  storeId: string,
  suggestion: BrandPendingSuggestion,
): Promise<void> {
  await pool.query(
    `update stores set brand_pending_suggestion = $2, brand_checked_at = now() where id = $1`,
    [storeId, JSON.stringify(suggestion)],
  );
}

export async function clearPendingBrandSuggestion(
  pool: Pool,
  storeId: string,
): Promise<void> {
  await pool.query(
    `update stores set brand_pending_suggestion = null where id = $1`,
    [storeId],
  );
}

export async function setStorePlatform(
  pool: Pool,
  storeId: string,
  platform: StorePlatform,
): Promise<void> {
  await pool.query(`update stores set platform = $2 where id = $1`, [storeId, platform]);
}

export async function setProductInventoryManual(
  pool: Pool,
  productId: string,
  storeId: string,
  qty: number,
): Promise<void> {
  // For non-Shopify stores, allow manual inventory updates per product.
  await pool.query(
    `update products set inventory_quantity = $3 where id = $1 and store_id = $2`,
    [productId, storeId, qty],
  );
}

export async function getStoresForBrandRefresh(
  pool: Pool,
  olderThanDays: number,
): Promise<Array<{ id: string; shopify_shop_domain: string; brand_detect_url: string }>> {
  const { rows } = await pool.query(
    `select id, shopify_shop_domain, brand_detect_url
       from stores
      where brand_detect_url is not null
        and (brand_checked_at is null or brand_checked_at < now() - ($1 || ' days')::interval)`,
    [olderThanDays],
  );
  return rows;
}
