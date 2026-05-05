import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@nfc/db";
import { syncReviewsForStore } from "../../../../lib/reviews/sync.js";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

// Refreshes reviews from all configured providers across all stores.
// Run via external cron (cron-job.org, Vercel Cron, etc.) every 24h.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const { rows: stores } = await pool.query<{ id: string; shopify_shop_domain: string }>(
    `select s.id, s.shopify_shop_domain
       from stores s
      where exists (
        select 1 from review_sources rs
         where rs.store_id = s.id and rs.enabled = true
           and rs.provider not in ('manual','public_search')
      )`,
  );

  const results: Array<{ shop: string; reviews_added: number }> = [];
  for (const store of stores) {
    try {
      const r = await syncReviewsForStore(pool, store.id, store.shopify_shop_domain);
      const total = r.provider_results.reduce((s, p) => s + p.reviews_added, 0);
      results.push({ shop: store.shopify_shop_domain, reviews_added: total });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[cron/reviews-refresh] failed for ${store.shopify_shop_domain}:`, err);
    }
  }

  return NextResponse.json({ stores_processed: results.length, results });
}
