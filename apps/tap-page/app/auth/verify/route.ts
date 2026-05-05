import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getPool, consumeAuthToken, findOrCreateCustomerByEmail,
  attachSessionTapsToCustomer,
} from "@nfc/db";
import { setCustomerCookie } from "@/lib/auth.js";
import { SESSION_COOKIE } from "@/lib/cookies.js";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const redirect = url.searchParams.get("redirect") ?? "/me";

  if (!token) {
    return NextResponse.redirect(new URL("/auth/expired", req.url));
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const consumed = await consumeAuthToken(pool, token);
  if (!consumed) {
    return NextResponse.redirect(new URL("/auth/expired", req.url));
  }

  const customer = await findOrCreateCustomerByEmail(pool, consumed.email);
  await setCustomerCookie(customer.id);

  // Attach the anonymous session's existing tap history to this customer.
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    try {
      await attachSessionTapsToCustomer(pool, customer.id, sessionId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[auth/verify] attachSessionTapsToCustomer failed:", err);
    }
  }

  return NextResponse.redirect(new URL(redirect, req.url));
}
