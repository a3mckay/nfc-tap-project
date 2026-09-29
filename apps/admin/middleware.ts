import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "./src/admin-auth.js";
import { pinShopParam } from "./src/shop-param.js";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};

const CURRENT_SHOP_COOKIE = "nfc_current_shop";

// The only page a staff session may visit (PRD v4 §7 Step 13b), plus sign-out.
const STAFF_HOME = "/training";
const STAFF_ALLOWED = [STAFF_HOME, "/api/logout"];

// Pages only super-admins may visit
const SUPER_ONLY_PREFIXES = ["/stores"];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const adminCookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(adminCookie);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  // ── Staff: only the staff home page ─────────────────────────────────────
  if (session.role === "staff") {
    if (!STAFF_ALLOWED.includes(pathname)) return NextResponse.redirect(new URL(STAFF_HOME, request.url));
    requestHeaders.set("x-session-role", "staff");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Store-admin enforcement ───────────────────────────────────────────────
  if (session.role === "store") {
    // Block super-admin-only pages
    if (SUPER_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.redirect(
        new URL(`/tags?shop=${encodeURIComponent(session.storeDomain)}`, request.url),
      );
    }

    // Always use their own store — pages read ?shop=, so redirect any other value
    const storeDomain = session.storeDomain;
    const pinned = pinShopParam(request.nextUrl, storeDomain);
    if (pinned) return NextResponse.redirect(pinned);

    requestHeaders.set("x-current-shop", storeDomain);
    requestHeaders.set("x-session-role", "store");
    requestHeaders.set("x-store-id", session.storeId);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    // Keep their shop cookie pinned to their store
    response.cookies.set(CURRENT_SHOP_COOKIE, storeDomain, { path: "/", sameSite: "lax" });
    return response;
  }

  // ── Super-admin: no restrictions ─────────────────────────────────────────
  requestHeaders.set("x-session-role", "super");

  const shopFromParam  = request.nextUrl.searchParams.get("shop");
  const shopFromCookie = request.cookies.get(CURRENT_SHOP_COOKIE)?.value;
  const currentShop    = shopFromParam ?? shopFromCookie ?? "";
  if (currentShop) requestHeaders.set("x-current-shop", currentShop);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (shopFromParam && shopFromParam !== shopFromCookie) {
    response.cookies.set(CURRENT_SHOP_COOKIE, shopFromParam, { path: "/", sameSite: "lax" });
  }
  return response;
}
