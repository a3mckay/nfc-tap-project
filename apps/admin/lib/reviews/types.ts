// Common shape every review adapter returns. The sync layer maps these onto
// external_reviews rows so adapters never touch the database directly.

export interface FetchedReview {
  external_id: string | null;
  author: string | null;
  author_avatar_url: string | null;
  rating: number | null;
  title: string | null;
  body: string;
  source_url: string | null;
  published_at: Date | null;
}

// Each store-product carries the identifiers an adapter needs (Shopify product ID,
// product handle, etc.). Adapters use whichever they need.
export interface ProductRef {
  product_id: string;            // our internal UUID
  shopify_product_id: string | null;
  title: string;
  handle?: string | null;        // some adapters use the URL handle
}

export interface ReviewAdapter {
  provider: "judgeme" | "loox" | "okendo" | "yotpo" | "stamped";
  source_label: string;          // e.g. "Judge.me"
  // Per-product fetch. The adapter is given the store's config (e.g. shop domain, API key)
  // and a product reference. Returns whatever reviews exist for that product.
  fetchReviewsForProduct(
    config: Record<string, unknown>,
    storeShopDomain: string,
    product: ProductRef,
  ): Promise<FetchedReview[]>;
}
