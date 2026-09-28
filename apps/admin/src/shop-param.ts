// Edge-safe (used by middleware). Admin pages read the store from ?shop=, so a
// store-role admin's URL must only ever name their own store. Returns the URL
// to redirect to when it names any other store, or null when it's fine as is.
export function pinShopParam(url: URL, storeDomain: string): URL | null {
  if (url.searchParams.getAll("shop").every((shop) => shop === storeDomain)) return null;
  const pinned = new URL(url);
  pinned.searchParams.set("shop", storeDomain);
  return pinned;
}
