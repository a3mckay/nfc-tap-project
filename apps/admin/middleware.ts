import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "./src/admin-auth.js";
import { pinShopParam } from "./src/shop-param.js";
import { can, permissionForPath, adminHomePath } from "./src/permissions.js";
import { needsLiveCheck, REFRESH_PATH } from "./src/session-refresh.js";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};

const CURRENT_SHOP_COOKIE = "nfc_current_shop";

// The only page a staff session may visit (PRD v4 §7 Step 13b), plus sign-out.
const STAFF_HOME = "/training";
const STAFF_ALLOWED = [STAFF_HOME, "/api/logout"];


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

  // Pages tell the layout which path it's rendering, so it can re-check a
  // manager's live role (the edge can't reach the database).
  requestHeaders.set("x-pathname", pathname);

  // ── Owners, managers and co-managers: own store, allowed areas only ───────
  if (session.role === "store" || session.role === "manager") {
    // Managers: re-read a stale role from the database first (server actions
    // re-read it themselves in getActionStore).
    if (pathname === REFRESH_PATH) return NextResponse.next();
    if (needsLiveCheck(session) && !request.headers.has("next-action")) {
      const refresh = new URL(REFRESH_PATH, request.url);
      refresh.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(refresh);
    }

    const needed = permissionForPath(pathname);
    if (needed && !can(session, needed)) {
      return NextResponse.redirect(new URL(adminHomePath(session), request.url));
    }

    // Always use their own store — pages read ?shop=, so redirect any other value
    const storeDomain = session.storeDomain;
    const pinned = pinShopParam(request.nextUrl, storeDomain);
    if (pinned) return NextResponse.redirect(pinned);

    requestHeaders.set("x-current-shop", storeDomain);
    requestHeaders.set("x-session-role", session.role);
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
