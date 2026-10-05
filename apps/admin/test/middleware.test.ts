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

describe("middleware for managers and co-managers", () => {
  const exp = () => Date.now() + 60_000;
  const managerCookie = (level: "manager" | "co_manager", checkedAt = Date.now()) =>
    signSession({ role: "manager", level, staffId: "m-1", storeId: "store-1", storeDomain: "own.myshopify.com", exp: exp(), checkedAt });
  const to = async (path: string, cookie: string) => {
    const loc = (await requestAs(path, cookie)).headers.get("location");
    return loc ? new URL(loc).pathname + new URL(loc).search : null;
  };

  it("lets a manager into day-to-day areas", async () => {
    const c = await managerCookie("manager");
    for (const path of ["/tags?shop=own.myshopify.com", "/staff?shop=own.myshopify.com", "/analytics?shop=own.myshopify.com", "/enrichment/p-1/training?shop=own.myshopify.com"]) {
      expect(await to(path, c), path).toBeNull();
    }
  });

  it("keeps a manager out of settings, theme, billing and all-stores", async () => {
    const c = await managerCookie("manager");
    for (const path of ["/settings?shop=own.myshopify.com", "/theme?shop=own.myshopify.com", "/plan?shop=own.myshopify.com", "/stores"]) {
      expect(await to(path, c), path).toBe("/?shop=own.myshopify.com");
    }
  });

  it("lets a co-manager into training notes, content and the Staff page only", async () => {
    const c = await managerCookie("co_manager");
    for (const path of ["/enrichment?shop=own.myshopify.com", "/enrichment/p-1/training?shop=own.myshopify.com", "/staff?shop=own.myshopify.com"]) {
      expect(await to(path, c), path).toBeNull();
    }
    for (const path of ["/tags?shop=own.myshopify.com", "/offers?shop=own.myshopify.com", "/analytics?shop=own.myshopify.com"]) {
      expect(await to(path, c), path).toBe("/?shop=own.myshopify.com");
    }
  });

  it("pins a manager to their own store", async () => {
    expect(await to("/tags?shop=other.myshopify.com", await managerCookie("manager"))).toBe("/tags?shop=own.myshopify.com");
  });

  it("sends a manager whose role hasn't been checked for a minute to be re-checked", async () => {
    const stale = await managerCookie("manager", Date.now() - 2 * 60_000);
    expect(await to("/analytics?shop=own.myshopify.com", stale))
      .toBe(`/api/session/refresh?next=${encodeURIComponent("/analytics?shop=own.myshopify.com")}`);
    // Route handlers too, e.g. the tag export
    expect(await to("/tags/export?shop=own.myshopify.com", stale))
      .toBe(`/api/session/refresh?next=${encodeURIComponent("/tags/export?shop=own.myshopify.com")}`);
  });

  it("lets the re-check itself and server actions through with a stale cookie", async () => {
    const stale = await managerCookie("manager", Date.now() - 2 * 60_000);
    expect(await to("/api/session/refresh?next=%2Ftags", stale)).toBeNull();
    // Server actions re-read the role themselves (getActionStore)
    const req = new NextRequest(new URL("/tags?shop=own.myshopify.com", "https://admin.test"), { method: "POST", headers: { "next-action": "abc" } });
    req.cookies.set(COOKIE_NAME, stale);
    expect((await middleware(req)).headers.get("location")).toBeNull();
  });

  it("still keeps owners out of all-stores", async () => {
    const owner = await signSession({ role: "store", storeId: "store-1", storeDomain: "own.myshopify.com" });
    expect(await to("/stores", owner)).toBe("/?shop=own.myshopify.com");
  });
});

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
