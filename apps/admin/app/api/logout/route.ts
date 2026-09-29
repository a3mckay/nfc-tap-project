import { NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../src/admin-auth.js";
import { tapPageBaseUrl } from "../../../src/tap-handoff.js";

// Signs out of the admin, then of the tap page (which sends the browser back to
// the admin login page).
export async function POST(_request: Request): Promise<NextResponse> {
  const response = NextResponse.redirect(`${tapPageBaseUrl()}/staff/signout`, 303);
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
