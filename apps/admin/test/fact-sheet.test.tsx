// The fact sheet's topics and examples follow the product's category
// (docs/category-labels.md §3).
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../app/enrichment/[product_id]/factActions.js", () => ({}));
const { FactSheet } = await import("../app/enrichment/[product_id]/FactSheet.js");
const { copyFor } = await import("@nfc/db");

const render = (category: Parameters<typeof copyFor>[0]) => renderToStaticMarkup(
  <FactSheet shop="s" productId="p" vendor="Masi" brandWebsite={null} facts={[]} factCopy={copyFor(category).facts} />,
);

describe("FactSheet", () => {
  it("offers the category's topics, starting on its default, with its example", () => {
    const html = render("wine");
    expect(html).toContain('<option value="winemaking" selected="">winemaking</option>');
    expect(html).toContain('<option value="pairing">');
    expect(html).not.toContain('<option value="sizing">');
    expect(html).toContain('placeholder="Aged 18 months in Slavonian oak"');
  });

  it("keeps clothing's topics for apparel", () => {
    const html = render("apparel");
    expect(html).toContain('<option value="fit" selected="">fit</option>');
    expect(html).toContain('placeholder="Runs half a size large"');
  });
});
