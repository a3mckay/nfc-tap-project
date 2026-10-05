import { NextRequest, NextResponse } from "next/server";
import { getPool, deleteExpiredRawData } from "@nfc/db";

// PRD v4 §7 Step 8c: deletes raw taps, reactions and chat questions older than
// 24 months. Called daily by .github/workflows/scheduled-jobs.yml with the
// shared secret, so it can't be triggered by anyone else.
const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  return NextResponse.json({ deleted: await deleteExpiredRawData(pool) });
}
