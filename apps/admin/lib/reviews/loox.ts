import type { ReviewAdapter, FetchedReview } from "./types.js";

// Loox API requires an API key (paid plans). Endpoint:
// GET https://loox.io/api/products/:product_id/reviews?app_key=...
// Returns photo-rich reviews. We pull body, rating, reviewer name, photo URL.
//
// Config shape: { app_key: string }

interface LooxReview {
  id: string;
  rating: number;
  body: string;
  title?: string;
  author?: { name?: string; avatar?: string };
  created_at: string;
  photos?: Array<{ url: string }>;
}

interface LooxResponse {
  reviews?: LooxReview[];
}

export const looxAdapter: ReviewAdapter = {
  provider: "loox",
  source_label: "Loox",

  async fetchReviewsForProduct(config, _storeShopDomain, product) {
    const appKey = config.app_key as string | undefined;
    if (!appKey || !product.shopify_product_id) return [];

    const url = `https://loox.io/api/products/${encodeURIComponent(product.shopify_product_id)}/reviews?app_key=${encodeURIComponent(appKey)}`;

    let data: LooxResponse;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return [];
      data = await res.json() as LooxResponse;
    } catch {
      return [];
    }

    return (data.reviews ?? []).map((r): FetchedReview => ({
      external_id: r.id,
      author: r.author?.name ?? null,
      author_avatar_url: r.author?.avatar ?? r.photos?.[0]?.url ?? null,
      rating: r.rating,
      title: r.title ?? null,
      body: r.body,
      source_url: null,
      published_at: r.created_at ? new Date(r.created_at) : null,
    }));
  },
};
