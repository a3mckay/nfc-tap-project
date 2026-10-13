// Cannabis Act promotion rules (founder decisions, 2026-10-07): the product
// editor has no customer reviews or staff quote for cannabis products.
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../app/enrichment/[product_id]/actions.js", () => ({ saveEnrichmentAction: vi.fn() }));
const { EnrichmentForm } = await import("../app/enrichment/[product_id]/EnrichmentForm.js");
const { copyFor } = await import("@nfc/db");

const initial = {
  shop: "own.myshopify.com", product_id: "p-1", is_manual: false, product_title: "", primary_image_url: "",
  backstory: "", fit_notes: "", materials: "", care_instructions: "", sustainability_notes: "",
  reasons_to_buy_text: "", staff_quote: "", staff_name: "", staff_photo_url: "", video_url: "",
  extra_images_text: "", reviews: [], awards_text: "", faq: [], internal_staff_notes: "", great_when_text: "",
};
const render = (hideTestimonials: boolean, category: Parameters<typeof copyFor>[0] = "apparel", manual = false) =>
  renderToStaticMarkup(<EnrichmentForm initial={{ ...initial, is_manual: manual }} productTitle="Animal Face" isAiGenerated={false}
    hideTestimonials={hideTestimonials} copy={copyFor(category)} />);

describe("EnrichmentForm", () => {
  it("shows customer reviews and the staff quote normally", () => {
    const html = render(false);
    expect(html).toContain("Customer Reviews");
    expect(html).toContain("Staff Perspective");
  });

  it("hides them for cannabis, and says why", () => {
    const html = render(true);
    expect(html).not.toContain("Customer Reviews");
    expect(html).not.toContain("Staff Perspective");
    expect(html).toMatch(/staff quotes aren.{1,6}t shown for cannabis/);
  });
});

describe("EnrichmentForm labels and examples by category (docs/category-labels.md)", () => {
  it("uses wine's words for a wine, and never clothing or footwear ones", () => {
    const html = render(false, "wine", true);
    for (const text of ["Winemaking", "Tasting notes", "Serving &amp; storage", "Farming", "Cherry and plum", "Campofiorin 2020", "Gambero Rosso", "Sam, Sommelier", "Valpolicella Classico"]) {
      expect(html, text).toContain(text);
    }
    expect(html).not.toMatch(/Fit &amp; Feel|Fit &amp; feel|Machine wash|Vogue|Fragile clasp|Air Force|merino|Senior Stylist|office to bar/i);
  });

  it("keeps clothing's words for apparel", () => {
    const html = render(false, "apparel");
    expect(html).toContain("Fit &amp; feel");
    expect(html).toContain("Machine wash cold");
  });

  it("asks for factual key points for cannabis", () => {
    expect(render(true, "cannabis")).toMatch(/factual quality/);
    expect(render(true, "cannabis")).toContain("No lifestyle images for cannabis");
  });
});
