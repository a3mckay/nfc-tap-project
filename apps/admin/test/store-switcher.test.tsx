// The super-admin's store switcher: switching reloads the page so the whole
// sidebar (store name and every menu link) follows the new store, and only each
// store's name and web address reach the browser.
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams("shop=dsw.prospect.tapshelf.co"),
  useRouter: () => ({ push: vi.fn() }),
}));
const { StoreSwitcher } = await import("../src/StoreSwitcher.js");
const { storeSwitchUrl, switcherStores } = await import("../src/store-switch.js");

describe("storeSwitchUrl", () => {
  it("keeps the current section and its other parameters, and swaps the store", () => {
    expect(storeSwitchUrl("/products", "shop=dsw.prospect.tapshelf.co&tab=2", "kit-and-ace.prospect.tapshelf.co"))
      .toBe("/products?shop=kit-and-ace.prospect.tapshelf.co&tab=2");
  });

  it("goes to the new store's products from the all-stores page", () => {
    expect(storeSwitchUrl("/stores", "", "kit-and-ace.prospect.tapshelf.co")).toBe("/products?shop=kit-and-ace.prospect.tapshelf.co");
  });

  it("goes to the new store's products from a product page (the old store's product isn't in the new store)", () => {
    expect(storeSwitchUrl("/enrichment/p-1", "shop=dsw.prospect.tapshelf.co", "kit-and-ace.prospect.tapshelf.co"))
      .toBe("/products?shop=kit-and-ace.prospect.tapshelf.co");
  });
});

describe("switcherStores", () => {
  it("passes only each store's web address and name to the browser (never its access token)", () => {
    const rows = [{ id: "s-1", shopify_shop_domain: "dsw.prospect.tapshelf.co", name: "DSW", shopify_access_token: "shpat_secret", theme_settings: {} }];
    expect(switcherStores(rows)).toEqual([{ shopify_shop_domain: "dsw.prospect.tapshelf.co", name: "DSW" }]);
  });
});

describe("StoreSwitcher", () => {
  it("shows the current store's name, not its web address", () => {
    const html = renderToStaticMarkup(
      <StoreSwitcher currentShop="dsw.prospect.tapshelf.co" stores={[
        { shopify_shop_domain: "dsw.prospect.tapshelf.co", name: "DSW" },
        { shopify_shop_domain: "kit-and-ace.prospect.tapshelf.co", name: "Kit and Ace" },
      ]} />,
    );
    expect(html).toContain(">DSW<");
    expect(html).not.toContain(">dsw.prospect.tapshelf.co<");
  });
});
