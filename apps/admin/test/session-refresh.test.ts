// Managers' cookies carry the role they had at sign-in. The middleware sends a
// cookie that hasn't been checked for a while through /api/session/refresh,
// which re-reads the role from the database, so demotions, removals and
// promotions reach every page, soft navigation and route handler.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { needsLiveCheck, safeNextPath, LIVE_CHECK_MS } from "../src/session-refresh.js";
import type { AdminSession } from "../src/admin-auth.js";

const live = vi.hoisted(() => ({ session: null as AdminSession | null }));
vi.mock("@nfc/db", () => ({ getPool: vi.fn(() => ({})) }));
vi.mock("@/current-store.js", () => ({ getCurrentAdminSession: vi.fn(async () => live.session) }));

const { GET } = await import("../app/api/session/refresh/route.js");
const { signSession, verifySession, managerSession, COOKIE_NAME } = await import("../src/admin-auth.js");

const who = { staffId: "m-1", storeId: "store-1", storeDomain: "own.myshopify.com" };

describe("needsLiveCheck", () => {
  const now = 1_000_000_000;

  it("is false for a manager checked within the last minute", () => {
    expect(needsLiveCheck(managerSession({ ...who, level: "manager" }, now), now + LIVE_CHECK_MS - 1)).toBe(false);
  });

  it("is true once the check is a minute old, or was never made", () => {
    const s = managerSession({ ...who, level: "manager" }, now);
    expect(needsLiveCheck(s, now + LIVE_CHECK_MS)).toBe(true);
    const { checkedAt: _, ...unchecked } = s;
    expect(needsLiveCheck(unchecked as AdminSession, now)).toBe(true);
  });

  it("is false for owners, super admins and staff", () => {
    expect(needsLiveCheck({ role: "store", storeId: "s", storeDomain: "d" }, now)).toBe(false);
    expect(needsLiveCheck({ role: "super" }, now)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths and drops anything else", () => {
    expect(safeNextPath("/tags?shop=own.myshopify.com")).toBe("/tags?shop=own.myshopify.com");
    for (const bad of [null, "", "//evil.com/x", "https://evil.com", "/\\evil.com", "tags"]) {
      expect(safeNextPath(bad), String(bad)).toBe("/");
    }
  });
});

describe("GET /api/session/refresh", () => {
  const call = async (cookie: string, next = "/analytics?shop=own.myshopify.com") => {
    const req = new NextRequest(new URL(`/api/session/refresh?next=${encodeURIComponent(next)}`, "https://admin.test"));
    req.cookies.set(COOKIE_NAME, cookie);
    return GET(req);
  };
  const where = (res: Response) => { const u = new URL(res.headers.get("location")!); return u.pathname + u.search; };
  const newCookie = (res: Response) => res.headers.get("set-cookie")?.match(new RegExp(`${COOKIE_NAME}=([^;]*)`))?.[1];

  beforeEach(() => { live.session = null; });

  it("re-signs the cookie with the role now in the database and goes back", async () => {
    const before = Date.now();
    const cookie = await signSession(managerSession({ ...who, level: "co_manager" }, before - 10 * 60_000));
    live.session = { ...(await verifySession(cookie))!, level: "manager" } as AdminSession;

    const res = await call(cookie);
    expect(where(res)).toBe("/analytics?shop=own.myshopify.com");
    const renewed = await verifySession(decodeURIComponent(newCookie(res)!));
    expect(renewed).toMatchObject({ role: "manager", level: "manager", staffId: "m-1" });
    expect((renewed as { checkedAt: number }).checkedAt).toBeGreaterThanOrEqual(before);
  });

  it("signs out someone who is no longer a manager or co-manager", async () => {
    const cookie = await signSession(managerSession({ ...who, level: "manager" }));
    live.session = null;
    const res = await call(cookie);
    expect(where(res)).toBe("/login?error=role");
    expect(newCookie(res)).toBe("");
  });

  it("never redirects off-site", async () => {
    const cookie = await signSession(managerSession({ ...who, level: "manager" }));
    live.session = await verifySession(cookie);
    expect(where(await call(cookie, "//evil.com/x"))).toBe("/");
  });
});
