import type { ReviewAdapter, FetchedReview } from "./types.js";

// Stamped.io Display API.
// GET https://stamped.io/api/widget/reviews?productId=...&storeUrl=...&apiKey=...
//
// Config shape: { api_key: string, store_hash: string }

interface StampedReview {
  id: number;
  reviewRating: number;
  reviewMessage: string;
  reviewTitle?: string;
  author: string;
  reviewerEmail?: string;
  dateCreated: string;
}

interface StampedResponse {
  data?: StampedReview[];
  reviews?: StampedReview[];
}

export const stampedAdapter: ReviewAdapter = {
  provider: "stamped",
  source_label: "Stamped",

  async fetchReviewsForProduct(config, storeShopDomain, product) {
    const apiKey = config.api_key as string | undefined;
    const storeUrl = (config.store_hash as string | undefined) ?? storeShopDomain;
    if (!apiKey || !product.shopify_product_id) return [];

    const url = `https://stamped.io/api/widget/reviews?productId=${encodeURIComponent(product.shopify_product_id)}&storeUrl=${encodeURIComponent(storeUrl)}&apiKey=${encodeURIComponent(apiKey)}`;

    let data: StampedResponse;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return [];
      data = await res.json() as StampedResponse;
    } catch {
      return [];
    }

    const reviews = data.data ?? data.reviews ?? [];
    return reviews.map((r): FetchedReview => ({
      external_id: String(r.id),
      author: r.author ?? null,
      author_avatar_url: null,
      rating: r.reviewRating,
      title: r.reviewTitle ?? null,
      body: r.reviewMessage,
      source_url: null,
      published_at: r.dateCreated ? new Date(r.dateCreated) : null,
    }));
  },
};
