// PRD v4 §7 Step 12: a prospect opens their kit's claim link, sets their own
// email and password, and is signed in as the owner of their demo store.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  redeemStoreClaim: vi.fn(),
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
}));
const jar = vi.hoisted(() => ({ set: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }));
const startTapHandoff = vi.hoisted(() => vi.fn(async (_pool: unknown, _p: unknown, returnPath: string) => `https://tapshelf.store/staff/handoff?r=${encodeURIComponent(returnPath)}`));

vi.mock("@nfc/db", () => db);
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/tap-handoff.js", () => ({ startTapHandoff }));

const { claimStoreAction } = await import("../app/login/claim/actions.js");
const { hashSignInToken } = await import("../src/sign-in-token.js");
const { verifySession } = await import("../src/admin-auth.js");

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
async function run(action: () => Promise<unknown>): Promise<string> {
  try { await action(); } catch (e) { return String((e as Error).message).replace("REDIRECT:", ""); }
  throw new Error("expected a redirect");
}
const good = { token: "tok", email: "Chris@Example.com", password: "a long password", confirm: "a long password" };

beforeEach(() => vi.clearAllMocks());

describe("claimStoreAction", () => {
  it("creates the owner's login from the link and signs them in to their store", async () => {
    db.redeemStoreClaim.mockResolvedValue({ ok: true, store_admin_id: "a-1", store_id: "store-1", store_domain: "dsw.prospect.tapshelf.co" });
    const to = await run(() => claimStoreAction(form(good)));

    expect(db.redeemStoreClaim).toHaveBeenCalledWith(expect.anything(), await hashSignInToken("tok"), "chris@example.com", "hashed:a long password");
    expect(await verifySession(jar.set.mock.calls.at(-1)![1] as string)).toMatchObject({ role: "store", storeId: "store-1", storeDomain: "dsw.prospect.tapshelf.co" });
    expect(startTapHandoff).toHaveBeenCalledWith(expect.anything(), { kind: "owner", storeAdminId: "a-1", storeId: "store-1" }, "/?shop=dsw.prospect.tapshelf.co");
    expect(to).toContain("staff/handoff");
  });

  it("checks the form before using up the link", async () => {
    expect(await run(() => claimStoreAction(form({ ...good, password: "short", confirm: "short" })))).toBe("/login/claim?token=tok&error=short");
    expect(await run(() => claimStoreAction(form({ ...good, confirm: "different password" })))).toBe("/login/claim?token=tok&error=mismatch");
    expect(await run(() => claimStoreAction(form({ ...good, email: "not-an-email" })))).toBe("/login/claim?token=tok&error=email");
    expect(db.redeemStoreClaim).not.toHaveBeenCalled();
  });

  it("says when the link is used up or expired, or the email already has a login", async () => {
    db.redeemStoreClaim.mockResolvedValue({ ok: false, reason: "expired" });
    expect(await run(() => claimStoreAction(form(good)))).toBe("/login/claim?error=expired");
    db.redeemStoreClaim.mockResolvedValue({ ok: false, reason: "email_taken" });
    expect(await run(() => claimStoreAction(form(good)))).toBe("/login/claim?token=tok&error=taken");
    expect(jar.set).not.toHaveBeenCalled();
  });
});
