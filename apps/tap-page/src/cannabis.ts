// Cannabis Act promotion rules (s.17) on the customer page. Founder decisions,
// 2026-10-07, pending legal review (ACTION_ITEMS.md): no testimonials, so no
// customer reviews, ratings or staff quotes for cannabis products.
import { specCategoryFor, type SpecCategory } from "@nfc/db";

// The product's spec category (PRD v4 §7 Step 15l): its override, else its type
// and title, else the store's main industry.
export function productCategory(
  product: { product_type: string | null; title: string; spec_category: string | null },
  store: { industry: string | null } | null,
): SpecCategory {
  return specCategoryFor({
    productType: product.product_type, title: product.title,
    override: product.spec_category, storeIndustry: store?.industry ?? null,
  });
}

interface TestimonialFields {
  enrichment: { staff_quote: string | null; staff_name: string | null; staff_photo_url: string | null; reviews: unknown[] } | null;
  externalReviews: unknown[];
  reviewAggregate: { count: number; avg_rating: number | null };
}

export function withoutTestimonials<T extends TestimonialFields>(category: string, page: T): T {
  if (category !== "cannabis") return page;
  return {
    ...page,
    enrichment: page.enrichment && { ...page.enrichment, staff_quote: null, staff_name: null, staff_photo_url: null, reviews: [] },
    externalReviews: [],
    reviewAggregate: { count: 0, avg_rating: null },
  };
}
