// PRD v4 §7 Step 13b: staff sign in on the admin with an emailed single-use link.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  getActiveStaffByEmail: vi.fn(),
  createStaffSignInToken: vi.fn(async (_pool: unknown, _staffId: string, _hash: string, _ttl: number) => {}),
  consumeStaffSignInToken: vi.fn(),
  createTapHandoffToken: vi.fn(async () => {}),
}));
const sendEmail = vi.hoisted(() => vi.fn(async (_email: { to: string; subject: string; html: string }) => {}));
const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }));
const headerMap = vi.hoisted(() => new Map<string, string>());

vi.mock("@nfc/db", () => db);
vi.mock("@nfc/email", () => ({ sendEmail }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (k: string) => headerMap.get(k) ?? null }) }));

const { requestStaffSignInAction } = await import("../app/login/staff/actions.js");
const { GET: verify } = await import("../app/login/staff/verify/route.js");
const { hashSignInToken } = await import("../src/sign-in-token.js");
const { verifySession, COOKIE_NAME } = await import("../src/admin-auth.js");

function form(email: string) {
  const f = new FormData();
  f.set("email", email);
  return f;
}

async function run(action: () => Promise<unknown>): Promise<string> {
  try { await action(); } catch (e) { return String((e as Error).message).replace("REDIRECT:", ""); }
  throw new Error("expected a redirect");
}

const alpha = { id: "st-a", store_id: "store-a", email: "sam@example.com", name: "Sam", store_domain: "alpha.myshopify.com", store_name: "Alpha" };
const beta  = { ...alpha, id: "st-b", store_id: "store-b", store_domain: "beta.myshopify.com", store_name: "Beta" };

beforeEach(() => {
  vi.clearAllMocks();
  headerMap.clear();
  headerMap.set("x-forwarded-host", "admin.tapshelf.co");
  headerMap.set("x-forwarded-proto", "https");
});

describe("requestStaffSignInAction", () => {
  it("emails one sign-in link per store the email is approved at", async () => {
    db.getActiveStaffByEmail.mockResolvedValue([alpha, beta]);
    expect(await run(() => requestStaffSignInAction(form(" Sam@Example.com ")))).toBe("/login/staff?sent=1");

    expect(db.getActiveStaffByEmail).toHaveBeenCalledWith(expect.anything(), "sam@example.com");
    expect(db.createStaffSignInToken).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { to, html } = sendEmail.mock.calls[0]![0];
    expect(to).toBe("sam@example.com");
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");

    // Each link carries a token whose hash is what was stored, for the right staff row.
    const tokens = [...html.matchAll(/https:\/\/admin\.tapshelf\.co\/login\/staff\/verify\?token=([A-Za-z0-9_-]+)/g)].map((m) => m[1]!);
    expect(new Set(tokens).size).toBe(2);
    const stored = db.createStaffSignInToken.mock.calls.map((c) => [c[1], c[2]]);
    for (const t of tokens) expect(stored.map(([, h]) => h)).toContain(await hashSignInToken(t));
    expect(stored.map(([id]) => id).sort()).toEqual(["st-a", "st-b"]);
  });

  it("shows the same 'sent' page for an email that isn't approved, without sending", async () => {
    db.getActiveStaffByEmail.mockResolvedValue([]);
    expect(await run(() => requestStaffSignInAction(form("nobody@example.com")))).toBe("/login/staff?sent=1");
    expect(db.createStaffSignInToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    expect(await run(() => requestStaffSignInAction(form("nope")))).toBe("/login/staff?error=email");
    expect(db.getActiveStaffByEmail).not.toHaveBeenCalled();
  });

  it("never puts a localhost address in the link", async () => {
    headerMap.clear();
    headerMap.set("host", "localhost:3000");
    db.getActiveStaffByEmail.mockResolvedValue([alpha]);
    await run(() => requestStaffSignInAction(form("sam@example.com")));
    const { html } = sendEmail.mock.calls[0]![0];
    expect(html).toContain("https://admin.tapshelf.co/login/staff/verify?token=");
  });
});

describe("GET /login/staff/verify", () => {
  const req = (token: string) => new NextRequest(`https://admin.tapshelf.co/login/staff/verify?token=${token}`);

  it("signs the staff member in for 30 days and sends them to the staff home page", async () => {
    db.consumeStaffSignInToken.mockResolvedValue({ staff_id: "st-a", store_id: "store-a", store_domain: "alpha.myshopify.com" });
    const res = await verify(req("tok123"));

    expect(db.consumeStaffSignInToken).toHaveBeenCalledWith(expect.anything(), await hashSignInToken("tok123"));
    // Straight on to the tap page to carry the sign-in over, then back to /training.
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin + loc.pathname).toBe("https://tapshelf.store/staff/handoff");
    expect(db.createTapHandoffToken).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      tokenHash: await hashSignInToken(loc.searchParams.get("token")!),
      principal: { kind: "staff", staffId: "st-a", storeId: "store-a" },
      returnPath: "/training",
    }));
    const cookie = res.cookies.get(COOKIE_NAME)!;
    expect(cookie.maxAge).toBe(30 * 24 * 60 * 60);
    expect(cookie.httpOnly).toBe(true);
    expect(await verifySession(cookie.value)).toMatchObject({ role: "staff", staffId: "st-a", storeId: "store-a", storeDomain: "alpha.myshopify.com" });
  });

  it("sends an invalid or used link back to the sign-in page without a cookie", async () => {
    db.consumeStaffSignInToken.mockResolvedValue(null);
    const res = await verify(req("bad"));
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname + loc.search).toBe("/login/staff?error=expired");
    expect(res.cookies.get(COOKIE_NAME)).toBeUndefined();
  });

  it("rejects a request with no token without touching the database", async () => {
    const res = await verify(new NextRequest("https://admin.tapshelf.co/login/staff/verify"));
    expect(new URL(res.headers.get("location")!).search).toBe("?error=expired");
    expect(db.consumeStaffSignInToken).not.toHaveBeenCalled();
  });
});
