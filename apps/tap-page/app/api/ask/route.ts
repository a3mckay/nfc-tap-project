import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPool, getTagByUuid } from "@nfc/db";
import { SESSION_COOKIE } from "@/lib/cookies.js";
import { getCurrentStaff } from "@/lib/staff-auth.js";
import { readAskBody, respondToAsk, notAvailable, badRequest } from "@/ask/respond.js";

// PRD v4 §7 Step 15c: a customer asks about the product on a live tag. Streams
// newline-delimited JSON events (see AskEvent in src/ask/handle.ts).
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  const body = await readAskBody(request);
  if (!body) return badRequest();
  if (!process.env.ANTHROPIC_API_KEY) return notAvailable();

  // The session cookie is set when the product page loads; it's what the
  // per-visit cap counts against.
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  if (!sessionId) return NextResponse.json({ error: "Open the product page first" }, { status: 400 });

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const [tag, staff] = await Promise.all([getTagByUuid(pool, body.tagUuid), getCurrentStaff()]);
  const isTeam = !!staff && !!tag && staff.storeId === tag.store_id;
  return respondToAsk(body, { audience: "customer", sessionId, isTeam, staffId: null });
}
