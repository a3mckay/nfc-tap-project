import type { ReviewAdapter, FetchedReview } from "./types.js";

// Judge.me public widget API: no auth needed for published reviews.
// Endpoint: https://judge.me/api/v1/widgets/product_review?shop_domain=...&handle=...&platform=shopify
// We use the simpler reviews/index endpoint which returns JSON.
//
// If `shop_domain` is the only config, the adapter works for any Shopify store with Judge.me installed.

interface JudgemeReview {
  id: number;
  title: string | null;
  body: string;
  rating: number;
  reviewer: { name: string; email?: string };
  created_at: string;
  pictures?: Array<{ urls: { compact: string } }>;
}

interface JudgemeResponse {
  reviews?: JudgemeReview[];
}

export const judgemeAdapter: ReviewAdapter = {
  provider: "judgeme",
  source_label: "Judge.me",

  async fetchReviewsForProduct(config, storeShopDomain, product) {
    const shopDomain = (config.shop_domain as string | undefined) ?? storeShopDomain;
    if (!product.shopify_product_id) return []; // Judge.me keys reviews by Shopify product ID

    const url = `https://judge.me/api/v1/reviews?shop_domain=${encodeURIComponent(shopDomain)}&platform=shopify&product_id=${encodeURIComponent(product.shopify_product_id)}&per_page=50`;

    let data: JudgemeResponse;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return [];
      data = await res.json() as JudgemeResponse;
    } catch {
      return [];
    }

    return (data.reviews ?? []).map((r): FetchedReview => ({
      external_id: String(r.id),
      author: r.reviewer?.name ?? null,
      author_avatar_url: null, // Judge.me doesn't expose avatars on the public endpoint
      rating: typeof r.rating === "number" ? r.rating : null,
      title: r.title,
      body: r.body,
      source_url: null,
      published_at: r.created_at ? new Date(r.created_at) : null,
    }));
  },
};
