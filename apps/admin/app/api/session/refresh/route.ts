import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@nfc/db";
import { signSession, COOKIE_NAME } from "@/admin-auth.js";
import { getCurrentAdminSession } from "@/current-store.js";
import { safeNextPath } from "@/session-refresh.js";

// The middleware sends managers here when their cookie's role is stale
// (src/session-refresh.ts). Re-signs the cookie with the role now in the
// database and returns to `next`, or signs them out if they're no longer a
// manager or co-manager.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const now = Date.now();
  const live = await getCurrentAdminSession(getPool({ connectionString: process.env.DATABASE_URL }));

  if (!live || live.role !== "manager") {
    if (live) return NextResponse.redirect(new URL(next, request.url));   // owners, super admins
    const response = NextResponse.redirect(new URL("/login?error=role", request.url));
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(COOKIE_NAME, await signSession({ ...live, checkedAt: now }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((live.exp - now) / 1000)),
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
