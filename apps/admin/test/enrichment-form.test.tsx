// Cannabis Act promotion rules (founder decisions, 2026-10-07): the product
// editor has no customer reviews or staff quote for cannabis products.
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../app/enrichment/[product_id]/actions.js", () => ({ saveEnrichmentAction: vi.fn() }));
const { EnrichmentForm } = await import("../app/enrichment/[product_id]/EnrichmentForm.js");

const initial = {
  shop: "own.myshopify.com", product_id: "p-1", is_manual: false, product_title: "", primary_image_url: "",
  backstory: "", fit_notes: "", materials: "", care_instructions: "", sustainability_notes: "",
  reasons_to_buy_text: "", staff_quote: "", staff_name: "", staff_photo_url: "", video_url: "",
  extra_images_text: "", reviews: [], awards_text: "", faq: [], internal_staff_notes: "", great_when_text: "",
};
const render = (hideTestimonials: boolean) =>
  renderToStaticMarkup(<EnrichmentForm initial={initial} productTitle="Animal Face" isAiGenerated={false} hideTestimonials={hideTestimonials} />);

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
