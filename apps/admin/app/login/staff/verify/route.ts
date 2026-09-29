import { NextRequest, NextResponse } from "next/server";
import { getPool, consumeStaffSignInToken } from "@nfc/db";
import {
  signSession, staffSession, COOKIE_NAME, STAFF_SESSION_MAX_AGE_SECONDS,
} from "@/admin-auth.js";
import { hashSignInToken } from "@/sign-in-token.js";
import { startTapHandoff } from "@/tap-handoff.js";

// Staff sign-in link target: a valid, unused link starts a 30-day staff session,
// then carries the sign-in over to the tap page before landing on /training.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const signedIn = token ? await consumeStaffSignInToken(pool, await hashSignInToken(token)) : null;

  if (!signedIn) {
    return NextResponse.redirect(new URL("/login/staff?error=expired", req.url));
  }

  const handoff = await startTapHandoff(
    pool,
    { kind: "staff", staffId: signedIn.staff_id, storeId: signedIn.store_id },
    "/training",
  );
  const res = NextResponse.redirect(handoff);
  res.cookies.set(
    COOKIE_NAME,
    await signSession(staffSession({
      staffId: signedIn.staff_id,
      storeId: signedIn.store_id,
      storeDomain: signedIn.store_domain,
    })),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === "production",
    },
  );
  return res;
}
