import type { ReviewProvider } from "@nfc/db";

// Maps Shopify app handles (slug-style identifiers) to our review provider names.
// We query GET /admin/api/2024-01/apps.json to see what's installed; if any of these
// slugs appear in the response, we auto-configure the matching provider.

const APP_HANDLE_MAP: Record<string, ReviewProvider> = {
  "judgeme": "judgeme",
  "judge-me-product-reviews": "judgeme",
  "loox": "loox",
  "loox-product-reviews": "loox",
  "okendo-reviews": "okendo",
  "okendo-product-reviews-ugc": "okendo",
  "yotpo": "yotpo",
  "yotpo-reviews-and-photos": "yotpo",
  "stamped-io-reviews": "stamped",
  "stamped": "stamped",
};

interface ShopifyAppEntry {
  app: { handle?: string; title?: string };
}

interface ShopifyAppsResponse {
  app_installations?: ShopifyAppEntry[];
}

export interface DetectedProvider {
  provider: ReviewProvider;
  app_title: string;
}

// Returns the providers we recognize that are installed on a Shopify shop.
// Empty array if none / unauthorized / API unreachable.
export async function detectInstalledReviewApp(
  shopDomain: string,
  accessToken: string,
): Promise<DetectedProvider[]> {
  const url = `https://${shopDomain}/admin/api/2024-01/app_installations.json`;

  let data: ShopifyAppsResponse;
  try {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": accessToken },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    data = await res.json() as ShopifyAppsResponse;
  } catch {
    return [];
  }

  const detected: DetectedProvider[] = [];
  const seen = new Set<ReviewProvider>();
  for (const entry of data.app_installations ?? []) {
    const handle = entry.app?.handle?.toLowerCase();
    if (!handle) continue;
    const provider = APP_HANDLE_MAP[handle];
    if (provider && !seen.has(provider)) {
      detected.push({ provider, app_title: entry.app?.title ?? handle });
      seen.add(provider);
    }
  }
  return detected;
}
