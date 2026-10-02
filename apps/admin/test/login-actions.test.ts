// Owners who sign in are also signed in on the tap page (PRD v4 §7 Step 13c),
// so they see the staff training view when they tap.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  getStoreAdminByEmail: vi.fn(),
  verifyPassword: vi.fn(async () => true),
  getStoreById: vi.fn(),
  getManagerLoginsByEmail: vi.fn(async () => []),
}));
const jar = vi.hoisted(() => ({ set: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }));
const startTapHandoff = vi.hoisted(() => vi.fn(async (_pool: unknown, _p: unknown, returnPath: string) => `https://tapshelf.store/staff/handoff?token=t&r=${encodeURIComponent(returnPath)}`));

vi.mock("@nfc/db", () => db);
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/tap-handoff.js", () => ({ startTapHandoff }));

const { loginAction } = await import("../app/login/actions.js");

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
async function run(action: () => Promise<unknown>): Promise<string> {
  try { await action(); } catch (e) { return String((e as Error).message).replace("REDIRECT:", ""); }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  vi.clearAllMocks();
  db.getStoreAdminByEmail.mockResolvedValue({ id: "admin-1", store_id: "store-1", password_hash: "x" });
  db.getStoreById.mockResolvedValue({ id: "store-1", shopify_shop_domain: "own.myshopify.com" });
  db.verifyPassword.mockResolvedValue(true);
});

describe("loginAction for store owners", () => {
  it("hands the sign-in to the tap page, then returns to the tags page", async () => {
    const to = await run(() => loginAction(form({ email: "owner@example.com", password: "pw" })));
    expect(to.startsWith("https://tapshelf.store/staff/handoff")).toBe(true);
    expect(startTapHandoff).toHaveBeenCalledWith(expect.anything(), { kind: "owner", storeAdminId: "admin-1", storeId: "store-1" }, "/tags?shop=own.myshopify.com");
    expect(jar.set).toHaveBeenCalled();
  });

  it("returns to onboarding after signup", async () => {
    await run(() => loginAction(form({ email: "owner@example.com", password: "pw", welcome: "1" })));
    expect(startTapHandoff.mock.calls[0]![2]).toBe("/onboarding?shop=own.myshopify.com&welcome=1");
  });

  it("does no handoff for a wrong password", async () => {
    db.verifyPassword.mockResolvedValue(false);
    const to = await run(() => loginAction(form({ email: "owner@example.com", password: "bad" })));
    expect(to).toContain("/login?");
    expect(startTapHandoff).not.toHaveBeenCalled();
  });
});
