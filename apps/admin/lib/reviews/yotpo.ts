import type { ReviewAdapter, FetchedReview } from "./types.js";

// Yotpo Reviews API.
// GET https://api.yotpo.com/v1/widget/:app_key/products/:product_id/reviews.json
//
// Config shape: { app_key: string }

interface YotpoReview {
  id: number;
  score: number;
  content: string;
  title?: string;
  user?: { display_name?: string; user_id?: number };
  created_at: string;
}

interface YotpoResponse {
  response?: { reviews?: YotpoReview[] };
}

export const yotpoAdapter: ReviewAdapter = {
  provider: "yotpo",
  source_label: "Yotpo",

  async fetchReviewsForProduct(config, _storeShopDomain, product) {
    const appKey = config.app_key as string | undefined;
    if (!appKey || !product.shopify_product_id) return [];

    const url = `https://api.yotpo.com/v1/widget/${encodeURIComponent(appKey)}/products/${encodeURIComponent(product.shopify_product_id)}/reviews.json`;

    let data: YotpoResponse;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return [];
      data = await res.json() as YotpoResponse;
    } catch {
      return [];
    }

    return (data.response?.reviews ?? []).map((r): FetchedReview => ({
      external_id: String(r.id),
      author: r.user?.display_name ?? null,
      author_avatar_url: null,
      rating: r.score,
      title: r.title ?? null,
      body: r.content,
      source_url: null,
      published_at: r.created_at ? new Date(r.created_at) : null,
    }));
  },
};
