// The super-admin's store switcher (apps/admin/src/StoreSwitcher.tsx). Plain
// helpers, so the server layout can use them too.

export interface SwitcherStore { shopify_shop_domain: string; name: string | null }

// Only each store's web address and name go to the browser: never the rest of
// the row (it includes the store's Shopify access token).
export function switcherStores(stores: Array<{ shopify_shop_domain: string; name: string | null }>): SwitcherStore[] {
  return stores.map((s) => ({ shopify_shop_domain: s.shopify_shop_domain, name: s.name }));
}

// Where switching store goes: the same section for the new store, or its
// products when the current page belongs to the old store (a product) or to no
// store (all stores).
export function storeSwitchUrl(pathname: string, search: string, domain: string): string {
  const storeSpecific = pathname === "/stores" || pathname.startsWith("/enrichment/") || !pathname.startsWith("/");
  if (storeSpecific) return `/products?shop=${domain}`;
  const params = new URLSearchParams(search);
  params.set("shop", domain);
  return `${pathname}?${params.toString().replace(/%2E/gi, ".")}`;
}
