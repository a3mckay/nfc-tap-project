// PRD v4 §7 Step 13c: tap-page end of the admin handoff, sign-out, and who's signed in.
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  consumeTapHandoffToken: vi.fn(),
  isTapPrincipalActive: vi.fn(async () => true),
}));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("@nfc/db", () => db);
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { name: k, value: jar.get(k)! } : undefined) }),
}));

const { GET: handoff } = await import("../app/staff/handoff/route.js");
const { GET: signout } = await import("../app/staff/signout/route.js");
const { getCurrentStaff } = await import("../src/lib/staff-auth.js");
const { STAFF_COOKIE, signStaffCookie, verifyStaffCookie, hashHandoffToken } = await import("../src/lib/staff-session.js");

beforeAll(() => { process.env.COOKIE_SECRET = "test-secret"; });
beforeEach(() => { vi.clearAllMocks(); jar.clear(); db.isTapPrincipalActive.mockResolvedValue(true); });

const staff = { kind: "staff", staffId: "st-1", storeId: "store-1" } as const;

describe("GET /staff/handoff", () => {
  it("sets the 30-day staff cookie and sends the browser back to the admin", async () => {
    db.consumeTapHandoffToken.mockResolvedValue({ principal: staff, returnPath: "/training" });
    const res = await handoff(new NextRequest("https://tapshelf.store/staff/handoff?token=tok"));
    expect(db.consumeTapHandoffToken).toHaveBeenCalledWith(expect.anything(), hashHandoffToken("tok"));
    expect(res.headers.get("location")).toBe("https://admin.tapshelf.co/training");
    const c = res.cookies.get(STAFF_COOKIE)!;
    expect(verifyStaffCookie(c.value)).toEqual(staff);
    expect(c.httpOnly).toBe(true);
    expect(c.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it("never redirects off the admin, whatever return path is stored", async () => {
    db.consumeTapHandoffToken.mockResolvedValue({ principal: staff, returnPath: "//evil.com" });
    const res = await handoff(new NextRequest("https://tapshelf.store/staff/handoff?token=tok"));
    expect(res.headers.get("location")).toBe("https://admin.tapshelf.co/");
  });

  it("sends a bad or used token back to the admin without a cookie", async () => {
    db.consumeTapHandoffToken.mockResolvedValue(null);
    const res = await handoff(new NextRequest("https://tapshelf.store/staff/handoff?token=bad"));
    expect(res.headers.get("location")).toBe("https://admin.tapshelf.co/");
    expect(res.cookies.get(STAFF_COOKIE)).toBeUndefined();
  });

  it("ignores a request with no token", async () => {
    const res = await handoff(new NextRequest("https://tapshelf.store/staff/handoff"));
    expect(db.consumeTapHandoffToken).not.toHaveBeenCalled();
    expect(res.cookies.get(STAFF_COOKIE)).toBeUndefined();
  });
});

describe("GET /staff/signout", () => {
  it("clears the staff cookie and returns to the admin login", async () => {
    const res = await signout(new NextRequest("https://tapshelf.store/staff/signout"));
    expect(res.headers.get("location")).toBe("https://admin.tapshelf.co/login");
    expect(res.cookies.get(STAFF_COOKIE)?.maxAge).toBe(0);
  });
});

describe("getCurrentStaff", () => {
  it("returns the signed-in staff member while they're still active", async () => {
    jar.set(STAFF_COOKIE, signStaffCookie(staff));
    expect(await getCurrentStaff()).toEqual(staff);
    expect(db.isTapPrincipalActive).toHaveBeenCalledWith(expect.anything(), staff);
  });

  it("returns null once they've been removed", async () => {
    jar.set(STAFF_COOKIE, signStaffCookie(staff));
    db.isTapPrincipalActive.mockResolvedValue(false);
    expect(await getCurrentStaff()).toBeNull();
  });

  it("returns null without a valid cookie, without touching the database", async () => {
    jar.set(STAFF_COOKIE, "forged.value");
    expect(await getCurrentStaff()).toBeNull();
    expect(db.isTapPrincipalActive).not.toHaveBeenCalled();
  });
});
