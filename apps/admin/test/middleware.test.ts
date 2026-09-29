// Staff sessions may only reach the staff home page (PRD v4 §7 Step 13b).
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware.js";
import { signSession, staffSession, COOKIE_NAME } from "../src/admin-auth.js";

async function requestAs(path: string, cookie?: string) {
  const req = new NextRequest(new URL(path, "https://admin.test"));
  if (cookie) req.cookies.set(COOKIE_NAME, cookie);
  return middleware(req);
}

const staffCookie = () =>
  signSession(staffSession({ staffId: "st-1", storeId: "store-1", storeDomain: "own.myshopify.com" }));

describe("middleware for staff sessions", () => {
  it("lets staff into the staff home page", async () => {
    const res = await requestAs("/training", await staffCookie());
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-request-x-session-role")).toBe("staff");
  });

  it("sends staff away from owner pages to the staff home page", async () => {
    for (const path of ["/tags?shop=own.myshopify.com", "/staff", "/stores", "/settings", "/"]) {
      const res = await requestAs(path, await staffCookie());
      expect(new URL(res.headers.get("location")!).pathname, path).toBe("/training");
    }
  });

  it("lets staff sign out", async () => {
    const req = new NextRequest(new URL("/api/logout", "https://admin.test"), { method: "POST" });
    req.cookies.set(COOKIE_NAME, await staffCookie());
    const res = await middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  it("still sends a request with no session to login", async () => {
    const res = await requestAs("/training");
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });
});
