// Managers and co-managers: set a password from the emailed link, then sign in with it.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  consumeSetPasswordToken: vi.fn(),
  setStaffPassword: vi.fn(async () => true),
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
  verifyPassword: vi.fn(async (p: string, h: string) => h === `hashed:${p}`),
  getStoreAdminByEmail: vi.fn(async () => null),
  getStoreById: vi.fn(),
  getManagerLoginsByEmail: vi.fn(async (_pool: unknown, _email: string): Promise<unknown[]> => []),
}));
const jar = vi.hoisted(() => ({ set: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }));
const startTapHandoff = vi.hoisted(() => vi.fn(async (_pool: unknown, _p: unknown, returnPath: string) => `https://tapshelf.store/staff/handoff?token=t&r=${encodeURIComponent(returnPath)}`));

vi.mock("@nfc/db", () => db);
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/tap-handoff.js", () => ({ startTapHandoff }));

const { setPasswordAction } = await import("../app/login/set-password/actions.js");
const { loginAction } = await import("../app/login/actions.js");
const { hashSignInToken } = await import("../src/sign-in-token.js");
const { verifySession, COOKIE_NAME } = await import("../src/admin-auth.js");

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
async function run(action: () => Promise<unknown>): Promise<string> {
  try { await action(); } catch (e) { return String((e as Error).message).replace("REDIRECT:", ""); }
  throw new Error("expected a redirect");
}
const cookieSet = async () => verifySession(jar.set.mock.calls.at(-1)![1] as string);

const manager = { staff_id: "m-1", store_id: "store-1", store_domain: "own.myshopify.com", role: "manager" };

beforeEach(() => {
  vi.clearAllMocks();
  db.getStoreAdminByEmail.mockResolvedValue(null);
  db.getManagerLoginsByEmail.mockResolvedValue([]);
});

describe("setPasswordAction", () => {
  it("saves the password, signs them in for 30 days, and hands off to the tap page", async () => {
    db.consumeSetPasswordToken.mockResolvedValue(manager);
    const to = await run(() => setPasswordAction(form({ token: "tok", password: "correct horse", confirm: "correct horse" })));
    expect(db.consumeSetPasswordToken).toHaveBeenCalledWith(expect.anything(), await hashSignInToken("tok"));
    expect(db.setStaffPassword).toHaveBeenCalledWith(expect.anything(), "m-1", "store-1", "hashed:correct horse");
    expect(await cookieSet()).toMatchObject({ role: "manager", level: "manager", staffId: "m-1", storeId: "store-1" });
    expect(jar.set.mock.calls.at(-1)![2]).toMatchObject({ httpOnly: true, maxAge: 30 * 24 * 60 * 60 });
    expect(startTapHandoff).toHaveBeenCalledWith(expect.anything(), { kind: "staff", staffId: "m-1", storeId: "store-1" }, "/tags?shop=own.myshopify.com");
    expect(to.startsWith("https://tapshelf.store/staff/handoff")).toBe(true);
  });

  it("sends a co-manager to the content list", async () => {
    db.consumeSetPasswordToken.mockResolvedValue({ ...manager, role: "co_manager" });
    await run(() => setPasswordAction(form({ token: "tok", password: "correct horse", confirm: "correct horse" })));
    expect(startTapHandoff.mock.calls[0]![2]).toBe("/enrichment?shop=own.myshopify.com");
  });

  it("checks the password before using up the link", async () => {
    expect(await run(() => setPasswordAction(form({ token: "tok", password: "short", confirm: "short" })))).toBe("/login/set-password?token=tok&error=short");
    expect(await run(() => setPasswordAction(form({ token: "tok", password: "correct horse", confirm: "different one" })))).toBe("/login/set-password?token=tok&error=mismatch");
    expect(db.consumeSetPasswordToken).not.toHaveBeenCalled();
  });

  it("doesn't sign them in if the password couldn't be saved (e.g. demoted meanwhile)", async () => {
    db.consumeSetPasswordToken.mockResolvedValue(manager);
    db.setStaffPassword.mockResolvedValueOnce(false);
    expect(await run(() => setPasswordAction(form({ token: "tok", password: "correct horse", confirm: "correct horse" })))).toBe("/login/set-password?error=expired");
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("rejects a used or expired link", async () => {
    db.consumeSetPasswordToken.mockResolvedValue(null);
    expect(await run(() => setPasswordAction(form({ token: "tok", password: "correct horse", confirm: "correct horse" })))).toBe("/login/set-password?error=expired");
    expect(db.setStaffPassword).not.toHaveBeenCalled();
    expect(jar.set).not.toHaveBeenCalled();
  });
});

describe("loginAction for managers", () => {
  const login = { id: "m-1", staff_id: "m-1", store_id: "store-1", store_domain: "own.myshopify.com", role: "co_manager", password_hash: "hashed:their password" };

  it("signs in a manager or co-manager with their own password", async () => {
    db.getManagerLoginsByEmail.mockResolvedValue([login]);
    const to = await run(() => loginAction(form({ email: "Morgan@Example.com", password: "their password" })));
    expect(await cookieSet()).toMatchObject({ role: "manager", level: "co_manager", staffId: "m-1", storeDomain: "own.myshopify.com" });
    expect(startTapHandoff).toHaveBeenCalledWith(expect.anything(), { kind: "staff", staffId: "m-1", storeId: "store-1" }, "/enrichment?shop=own.myshopify.com");
    expect(to.startsWith("https://tapshelf.store/staff/handoff")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    db.getManagerLoginsByEmail.mockResolvedValue([login]);
    expect(await run(() => loginAction(form({ email: "morgan@example.com", password: "nope" })))).toContain("/login?");
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("still signs owners in first", async () => {
    db.getStoreAdminByEmail.mockResolvedValue({ id: "a-1", store_id: "store-1", password_hash: "hashed:owner pw" } as never);
    db.getStoreById.mockResolvedValue({ id: "store-1", shopify_shop_domain: "own.myshopify.com" });
    await run(() => loginAction(form({ email: "owner@example.com", password: "owner pw" })));
    expect(await cookieSet()).toMatchObject({ role: "store" });
    expect(db.getManagerLoginsByEmail).not.toHaveBeenCalled();
  });
});
