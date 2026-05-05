import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, COOKIE_NAME } from "./src/admin-auth.js";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};

const CURRENT_SHOP_COOKIE = "nfc_current_shop";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const adminCookie = request.cookies.get(COOKIE_NAME)?.value;
  const ok = await verifyAdminCookie(adminCookie);
  if (!ok) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Track the active shop so the layout can show per-store nav
  const shopFromParam = request.nextUrl.searchParams.get("shop");
  const shopFromCookie = request.cookies.get(CURRENT_SHOP_COOKIE)?.value;
  const currentShop = shopFromParam ?? shopFromCookie ?? "";

  const requestHeaders = new Headers(request.headers);
  if (currentShop) requestHeaders.set("x-current-shop", currentShop);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (shopFromParam && shopFromParam !== shopFromCookie) {
    response.cookies.set(CURRENT_SHOP_COOKIE, shopFromParam, { path: "/", sameSite: "lax" });
  }
  return response;
}
