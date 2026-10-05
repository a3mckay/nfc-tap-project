import { NextRequest, NextResponse } from "next/server";
import { getPool, getTagByUuid } from "@nfc/db";
import { getCurrentStaff } from "@/lib/staff-auth.js";
import { readAskBody, respondToAsk, notAvailable, badRequest } from "@/ask/respond.js";

// PRD v4 §7 Step 15h: the Ask box in the staff training view. Only signed-in
// staff (or the owner) of the tag's store; the assistant can also use internal
// notes and recent customer questions, and the question is recorded as a staff
// question (D31).
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  const body = await readAskBody(request);
  if (!body) return badRequest();

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const [tag, staff] = await Promise.all([getTagByUuid(pool, body.tagUuid), getCurrentStaff()]);
  if (!staff || !tag || staff.storeId !== tag.store_id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) return notAvailable();
  return respondToAsk(body, { audience: "staff", sessionId: null, isTeam: true, staffId: staff.kind === "staff" ? staff.staffId : null });
}
