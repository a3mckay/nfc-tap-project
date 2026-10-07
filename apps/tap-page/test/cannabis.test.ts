// Cannabis Act promotion rules on the customer page (founder decisions,
// 2026-10-07): no customer reviews or staff quotes for cannabis products.
import { describe, it, expect, vi } from "vitest";

vi.mock("@nfc/db", () => ({
  specCategoryFor: (p: { productType: string | null; title: string; override?: string | null; storeIndustry?: string | null }) =>
    p.override ?? (/flower|sativa/i.test(`${p.productType} ${p.title}`) ? "cannabis" : p.storeIndustry ?? "general"),
}));

const { productCategory, withoutTestimonials } = await import("@/cannabis.js");

const enrichment = {
  staff_quote: "Punches you in the nose with lemon cake", staff_name: "Alex", staff_photo_url: "https://x/a.jpg",
  reviews: [{ author: "Sam", text: "Best high", rating: 5, source: "In-store" }],
  backstory: "Hand-picked pheno",
};
const page = {
  enrichment,
  externalReviews: [{ id: "r1", body: "Great" }],
  reviewAggregate: { count: 4, avg_rating: 4.5 },
};

describe("productCategory", () => {
  it("uses the product's override, type and title, then the store's industry", () => {
    expect(productCategory({ product_type: "Dried flower", title: "Animal Face", spec_category: null }, { industry: null })).toBe("cannabis");
    expect(productCategory({ product_type: "Boots", title: "Chukka", spec_category: "cannabis" }, null)).toBe("cannabis");
    expect(productCategory({ product_type: null, title: "Gift card", spec_category: null }, { industry: "wine" })).toBe("wine");
  });
});

describe("withoutTestimonials", () => {
  it("removes reviews, ratings and the staff quote for cannabis", () => {
    const safe = withoutTestimonials("cannabis", page);
    expect(safe.externalReviews).toEqual([]);
    expect(safe.reviewAggregate).toEqual({ count: 0, avg_rating: null });
    expect(safe.enrichment).toMatchObject({ staff_quote: null, staff_name: null, staff_photo_url: null, reviews: [] });
    expect(safe.enrichment?.backstory).toBe("Hand-picked pheno");
  });

  it("leaves other categories alone, and copes with no enrichment", () => {
    expect(withoutTestimonials("footwear", page)).toBe(page);
    expect(withoutTestimonials("cannabis", { ...page, enrichment: null }).enrichment).toBeNull();
  });
});
