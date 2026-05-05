import { NextRequest, NextResponse } from "next/server";
import { getPool, getStoresForBrandRefresh, storePendingBrandSuggestion } from "@nfc/db";
import { detectBrandAction } from "../.././../theme/detect-brand-action.js";

// Called by an external cron (e.g. cron-job.org or Vercel Cron) every 2 weeks.
// Protect with a shared secret so it can't be triggered by anyone.
const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const stores = await getStoresForBrandRefresh(pool, 14); // re-check every 14 days

  const results: Array<{ domain: string; status: string }> = [];

  for (const store of stores) {
    const { result, error } = await detectBrandAction(store.brand_detect_url);
    if (error || !result) {
      results.push({ domain: store.shopify_shop_domain, status: `error: ${error}` });
      continue;
    }

    await storePendingBrandSuggestion(pool, store.id, {
      ...result,
      detected_at: new Date().toISOString(),
    });

    results.push({ domain: store.shopify_shop_domain, status: "suggestion stored" });
  }

  return NextResponse.json({ refreshed: results.length, results });
}
