// Customer page | Staff training tabs at the top of a product's edit pages.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductTabs } from "../src/ProductTabs.js";

const render = (current: "customer" | "training") =>
  renderToStaticMarkup(<ProductTabs shop="own.myshopify.com" productId="p-1" current={current} />);

describe("ProductTabs", () => {
  it("links the customer page and the staff training page for the same product and shop", () => {
    const html = render("customer");
    expect(html).toContain('href="/enrichment/p-1?shop=own.myshopify.com"');
    expect(html).toContain('href="/enrichment/p-1/training?shop=own.myshopify.com"');
  });

  it("marks the current tab", () => {
    expect(render("customer")).toMatch(/aria-current="page"[^>]*>Customer page</);
    expect(render("training")).toMatch(/aria-current="page"[^>]*>Staff training</);
  });
});
