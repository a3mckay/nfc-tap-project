// Cannabis Act promotion rules (s.17) on the customer page. Founder decisions,
// 2026-10-07, pending legal review (ACTION_ITEMS.md): no testimonials, so no
// customer reviews, ratings or staff quotes for cannabis products; and a basic
// 19+ age gate, since a tap-page link can be opened outside the store.
import type { Metadata } from "next";
import { specCategoryFor, type SpecCategory } from "@nfc/db";

// 19 in most provinces (18 in Alberta, 21 in Quebec); stores have no province
// yet (DEFERRED.md).
export const CANNABIS_MIN_AGE = 19;
export const AGE_COOKIE = `age_ok_${CANNABIS_MIN_AGE}`;

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

// The store's own team (staff, managers, owners) is of age and skips the gate.
export function needsAgeGate(category: string, ageCookie: string | undefined, isTeam: boolean): boolean {
  return category === "cannabis" && !isTeam && ageCookie !== "1";
}

// Link previews of cannabis pages show only the store's name: no product,
// photo or key point. Not indexed by search engines.
export function ageGateMetadata(storeName: string): Metadata {
  return { title: storeName || "TapShelf", robots: { index: false, follow: false } };
}
