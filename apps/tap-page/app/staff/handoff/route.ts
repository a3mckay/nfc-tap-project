import { NextRequest, NextResponse } from "next/server";
import { getPool, consumeTapHandoffToken } from "@nfc/db";
import {
  STAFF_COOKIE, STAFF_COOKIE_MAX_AGE_SECONDS, signStaffCookie, hashHandoffToken, adminBaseUrl, safeReturnPath,
} from "@/lib/staff-session.js";

// Tap-page end of the admin sign-in handoff (PRD v4 §7 Step 13c): a valid,
// unused token sets the staff cookie, then the browser goes back to the admin.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const handedOff = token ? await consumeTapHandoffToken(pool, hashHandoffToken(token)) : null;

  if (!handedOff) return NextResponse.redirect(`${adminBaseUrl()}/`);

  const res = NextResponse.redirect(`${adminBaseUrl()}${safeReturnPath(handedOff.returnPath)}`);
  res.cookies.set(STAFF_COOKIE, signStaffCookie(handedOff.principal), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
