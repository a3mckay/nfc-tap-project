import {
  type Pool, upsertExternalReview, upsertAward,
} from "@nfc/db";
import { braveSearch } from "./search.js";
import { extractReviewsFromResults, type ExtractedReview } from "./extract.js";

export interface RunResult {
  product_id: string;
  results_searched: number;
  items_extracted: number;
  items_stored: number;
  error?: string;
}

// Searches the web for reviews/awards/press of a single product, runs extraction,
// and stores results as 'pending' for the store owner to approve.
export async function runPublicReviewsForProduct(
  pool: Pool,
  storeId: string,
  productId: string,
  productTitle: string,
  productVendor: string | null,
): Promise<RunResult> {
  const query = productVendor
    ? `"${productVendor}" "${productTitle}" review OR award OR "as seen in"`
    : `"${productTitle}" review`;

  let results;
  try {
    results = await braveSearch(query, 10);
  } catch (err) {
    return {
      product_id: productId,
      results_searched: 0,
      items_extracted: 0,
      items_stored: 0,
      error: err instanceof Error ? err.message : "search failed",
    };
  }

  let items: ExtractedReview[] = [];
  try {
    items = await extractReviewsFromResults(productTitle, productVendor, results);
  } catch (err) {
    return {
      product_id: productId,
      results_searched: results.length,
      items_extracted: 0,
      items_stored: 0,
      error: err instanceof Error ? err.message : "extraction failed",
    };
  }

  let stored = 0;
  for (const item of items) {
    try {
      if (item.type === "award") {
        await upsertAward(pool, {
          store_id: storeId,
          product_id: productId,
          title: item.award_title ?? item.excerpt.slice(0, 80),
          awarding_body: item.awarding_body ?? item.source_name,
          year: item.year,
          source_url: item.source_url,
          source_label: item.source_name,
          status: "pending",
        });
      } else {
        await upsertExternalReview(pool, {
          store_id: storeId,
          product_id: productId,
          provider: "public_search",
          external_id: item.source_url,
          author: item.source_name,
          author_avatar_url: null,
          rating: item.rating,
          title: null,
          body: item.excerpt,
          source_url: item.source_url,
          source_label: item.source_name,
          published_at: item.date ? new Date(item.date) : null,
          status: "pending",
        });
      }
      stored++;
    } catch {
      // Ignore individual write failures
    }
  }

  return {
    product_id: productId,
    results_searched: results.length,
    items_extracted: items.length,
    items_stored: stored,
  };
}
