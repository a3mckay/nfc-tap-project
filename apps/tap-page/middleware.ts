import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "nfc_session";

// Sets an anonymous session cookie on every request to /p/* if one isn't present.
// The server component reads this cookie to record tap_events without PII.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(SESSION_COOKIE)) {
    res.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      // 1 year — long enough to track dwell across sessions, not so long it's surveillance
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}

export const config = { matcher: ["/p/:path*", "/me", "/auth/:path*"] };
