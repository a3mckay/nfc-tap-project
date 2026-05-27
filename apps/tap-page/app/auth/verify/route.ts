import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getPool, consumeAuthToken, findOrCreateCustomerByEmail,
  attachSessionTapsToCustomer,
} from "@nfc/db";
import { setCustomerCookie } from "@/lib/auth.js";
import { SESSION_COOKIE } from "@/lib/cookies.js";

function getPublicBaseUrl(req: NextRequest): string {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  const fwdHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (fwdHost && !fwdHost.startsWith("localhost") && !fwdHost.startsWith("127.")) {
    return `${proto}://${fwdHost}`;
  }
  const host = req.headers.get("host");
  if (host && !host.startsWith("localhost") && !host.startsWith("127.")) {
    return `${proto}://${host}`;
  }
  return "https://tapshelf.store";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const redirect = url.searchParams.get("redirect") ?? "/me";
  const baseUrl = getPublicBaseUrl(req);

  if (!token) {
    return NextResponse.redirect(new URL("/auth/expired", baseUrl));
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const consumed = await consumeAuthToken(pool, token);
  if (!consumed) {
    return NextResponse.redirect(new URL("/auth/expired", baseUrl));
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

  return NextResponse.redirect(new URL(redirect, baseUrl));
}
