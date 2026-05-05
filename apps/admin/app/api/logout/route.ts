import { NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../src/admin-auth.js";

export async function POST(request: Request): Promise<NextResponse> {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const response = NextResponse.redirect(new URL("/login", `${proto}://${host}`));
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
