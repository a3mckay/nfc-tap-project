import { NextRequest, NextResponse } from "next/server";
import { STAFF_COOKIE, adminBaseUrl } from "@/lib/staff-session.js";

// Admin sign-out passes through here to clear the tap page's staff cookie.
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.redirect(`${adminBaseUrl()}/login`);
  res.cookies.set(STAFF_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
