// Who can promote, demote and remove whom on the Staff page.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  getStaffMember: vi.fn(),
  setStaffRole: vi.fn(async () => true),
  revokeStaff: vi.fn(async () => true),
  approveStaffEmail: vi.fn(async () => ({})),
  createSetPasswordToken: vi.fn(async (_pool: unknown, _staffId: string, _hash: string, _ttl: number) => {}),
}));
const allowed = vi.hoisted(() => ({ perms: new Set<string>() }));
const getActionStore = vi.hoisted(() => vi.fn(async (_pool: unknown, _shop: string, perm: string) =>
  allowed.perms.has(perm) ? { id: "store-1", shopify_shop_domain: "own.myshopify.com", name: "Own" } : null));
const sendEmail = vi.hoisted(() => vi.fn(async (_e: { to: string; subject: string; html: string }) => {}));

vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@nfc/email", () => ({ sendEmail }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (k: string) => (k === "x-forwarded-host" ? "admin.tapshelf.co" : null) }) }));

const { setStaffRoleAction, removeStaffAction } = await import("../app/staff/actions.js");
const { hashSignInToken } = await import("../src/sign-in-token.js");

const OWNER = ["staff", "assign_co_manager", "assign_manager"];
const MANAGER = ["staff", "assign_co_manager"];
const CO_MANAGER: string[] = [];
const as = (perms: string[]) => { allowed.perms = new Set(perms); };
const target = (role: "staff" | "co_manager" | "manager") => db.getStaffMember.mockResolvedValue({ id: "t-1", role, email: "t@example.com" });

beforeEach(() => { vi.clearAllMocks(); db.setStaffRole.mockResolvedValue(true); db.revokeStaff.mockResolvedValue(true); });

describe("setStaffRoleAction", () => {
  it("lets the owner make someone a manager", async () => {
    as(OWNER); target("staff");
    expect(await setStaffRoleAction("own.myshopify.com", "t-1", "manager")).toEqual({});
    expect(db.setStaffRole).toHaveBeenCalledWith(expect.anything(), "t-1", "store-1", "manager");
  });

  it("lets a manager make someone a co-manager, or back to staff", async () => {
    as(MANAGER); target("staff");
    expect(await setStaffRoleAction("own.myshopify.com", "t-1", "co_manager")).toEqual({});
    target("co_manager");
    expect(await setStaffRoleAction("own.myshopify.com", "t-1", "staff")).toEqual({});
  });

  it("doesn't let a manager make managers, or change a manager (including themselves)", async () => {
    as(MANAGER); target("staff");
    expect(await setStaffRoleAction("own.myshopify.com", "t-1", "manager")).toEqual({ error: "Only the owner can do that" });
    target("manager");
    expect(await setStaffRoleAction("own.myshopify.com", "t-1", "co_manager")).toEqual({ error: "Only the owner can do that" });
    expect(db.setStaffRole).not.toHaveBeenCalled();
  });

  it("doesn't let a co-manager change roles", async () => {
    as(CO_MANAGER); target("staff");
    expect(await setStaffRoleAction("own.myshopify.com", "t-1", "co_manager")).toEqual({ error: "Not allowed" });
    expect(db.setStaffRole).not.toHaveBeenCalled();
  });

  it("rejects an unknown role or someone not on this store's list", async () => {
    as(OWNER); target("staff");
    expect(await setStaffRoleAction("own.myshopify.com", "t-1", "owner" as never)).toEqual({ error: "Unknown role" });
    db.getStaffMember.mockResolvedValue(null);
    expect(await setStaffRoleAction("own.myshopify.com", "t-x", "co_manager")).toEqual({ error: "Staff member not found" });
  });
});

describe("promotion emails", () => {
  it("emails a new manager or co-manager a link to set their password", async () => {
    as(OWNER); target("staff");
    await setStaffRoleAction("own.myshopify.com", "t-1", "manager");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { to, subject, html } = sendEmail.mock.calls[0]![0];
    expect(to).toBe("t@example.com");
    expect(subject).toContain("Own");
    const token = html.match(/https:\/\/admin\.tapshelf\.co\/login\/set-password\?token=([A-Za-z0-9_-]+)/)![1]!;
    const [, staffId, hash, ttl] = db.createSetPasswordToken.mock.calls[0]!;
    expect([staffId, hash, ttl]).toEqual(["t-1", await hashSignInToken(token), 72 * 60]);
  });

  it("sends no email when moving between manager roles or back to staff", async () => {
    as(OWNER);
    db.getStaffMember.mockResolvedValue({ id: "t-1", role: "co_manager", email: "t@example.com", has_password: true });
    await setStaffRoleAction("own.myshopify.com", "t-1", "manager");
    target("manager");
    await setStaffRoleAction("own.myshopify.com", "t-1", "staff");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends a new link when a co-manager who never set a password becomes a manager", async () => {
    as(OWNER);
    db.getStaffMember.mockResolvedValue({ id: "t-1", role: "co_manager", email: "t@example.com", has_password: false });
    await setStaffRoleAction("own.myshopify.com", "t-1", "manager");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(db.createSetPasswordToken).toHaveBeenCalledTimes(1);
  });

  it("still changes the role if the email fails", async () => {
    as(OWNER); target("staff");
    sendEmail.mockRejectedValueOnce(new Error("down"));
    expect(await setStaffRoleAction("own.myshopify.com", "t-1", "co_manager")).toEqual({ warning: "Role changed, but the password email couldn't be sent" });
    expect(db.setStaffRole).toHaveBeenCalled();
  });
});

describe("removeStaffAction", () => {
  it("lets a manager remove staff and co-managers", async () => {
    as(MANAGER); target("co_manager");
    expect(await removeStaffAction("own.myshopify.com", "t-1")).toEqual({});
    expect(db.revokeStaff).toHaveBeenCalledWith(expect.anything(), "t-1", "store-1");
  });

  it("doesn't let a manager remove a manager", async () => {
    as(MANAGER); target("manager");
    expect(await removeStaffAction("own.myshopify.com", "t-1")).toEqual({ error: "Only the owner can do that" });
    expect(db.revokeStaff).not.toHaveBeenCalled();
  });

  it("lets the owner remove a manager", async () => {
    as(OWNER); target("manager");
    expect(await removeStaffAction("own.myshopify.com", "t-1")).toEqual({});
  });

  it("doesn't let a co-manager remove anyone", async () => {
    as(CO_MANAGER); target("staff");
    expect(await removeStaffAction("own.myshopify.com", "t-1")).toEqual({ error: "Not allowed" });
  });
});
