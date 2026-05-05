import type { ReviewAdapter, FetchedReview } from "./types.js";

// Okendo's public widget API for fetching product reviews.
// GET https://api.okendo.io/v1/stores/:subscriber_id/products/:product_id/reviews
//
// Config shape: { subscriber_id: string }

interface OkendoReview {
  reviewId: string;
  rating: number;
  body: string;
  title?: string;
  reviewer?: { displayName?: string; profileImageUrl?: string };
  dateCreated: string;
}

interface OkendoResponse {
  reviews?: OkendoReview[];
}

export const okendoAdapter: ReviewAdapter = {
  provider: "okendo",
  source_label: "Okendo",

  async fetchReviewsForProduct(config, _storeShopDomain, product) {
    const subscriberId = config.subscriber_id as string | undefined;
    if (!subscriberId || !product.shopify_product_id) return [];

    const url = `https://api.okendo.io/v1/stores/${encodeURIComponent(subscriberId)}/products/${encodeURIComponent(product.shopify_product_id)}/reviews`;

    let data: OkendoResponse;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return [];
      data = await res.json() as OkendoResponse;
    } catch {
      return [];
    }

    return (data.reviews ?? []).map((r): FetchedReview => ({
      external_id: r.reviewId,
      author: r.reviewer?.displayName ?? null,
      author_avatar_url: r.reviewer?.profileImageUrl ?? null,
      rating: r.rating,
      title: r.title ?? null,
      body: r.body,
      source_url: null,
      published_at: r.dateCreated ? new Date(r.dateCreated) : null,
    }));
  },
};
