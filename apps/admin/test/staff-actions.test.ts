// PRD v4 §7 Step 13a: the admin Staff page acts only on the session's store.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  approveStaffEmail: vi.fn(async () => ({})),
  revokeStaff: vi.fn(async () => true),
  getStaffMember: vi.fn(async () => ({ id: "staff-1", role: "staff" })),
}));
const getActionStore = vi.hoisted(() => vi.fn());
const sendEmail = vi.hoisted(() => vi.fn(async (_email: { to: string; subject: string; html: string }) => {}));

vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@nfc/email", () => ({ sendEmail }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (k: string) => (k === "x-forwarded-host" ? "admin.tapshelf.co" : null) }) }));

const { approveStaffAction, removeStaffAction } = await import("../app/staff/actions.js");

const SHOP = "own.myshopify.com";

beforeEach(() => {
  vi.clearAllMocks();
  getActionStore.mockResolvedValue({ id: "store-own", shopify_shop_domain: SHOP, name: "Own Boutique" });
  db.revokeStaff.mockResolvedValue(true);
});

describe("approveStaffAction", () => {
  it("approves a normalized email for the session's store", async () => {
    expect(await approveStaffAction(SHOP, " Sam@Example.com ", " Sam ")).toEqual({});
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), SHOP, "staff");
    expect(db.approveStaffEmail).toHaveBeenCalledWith(expect.anything(), "store-own", "sam@example.com", "Sam");
  });

  it("emails the new staff member an invite to the staff sign-in page", async () => {
    await approveStaffAction(SHOP, "Sam@Example.com", "Sam");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { to, subject, html } = sendEmail.mock.calls[0]![0];
    expect(to).toBe("sam@example.com");
    expect(subject).toContain("Own Boutique");
    expect(html).toContain("https://admin.tapshelf.co/login/staff?email=sam%40example.com");
  });

  it("still approves the email if the invite fails to send", async () => {
    sendEmail.mockRejectedValueOnce(new Error("Resend down"));
    expect(await approveStaffAction(SHOP, "sam@example.com", "")).toEqual({ warning: "Added, but the invite email couldn't be sent" });
    expect(db.approveStaffEmail).toHaveBeenCalled();
  });

  it("stores a blank name as null", async () => {
    await approveStaffAction(SHOP, "sam@example.com", "  ");
    expect(db.approveStaffEmail).toHaveBeenCalledWith(expect.anything(), "store-own", "sam@example.com", null);
  });

  it("rejects an invalid email without writing", async () => {
    expect(await approveStaffAction(SHOP, "not-an-email", "")).toEqual({ error: "Enter a valid email address" });
    expect(db.approveStaffEmail).not.toHaveBeenCalled();
  });

  it("does nothing without a store", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await approveStaffAction(SHOP, "sam@example.com", "")).toEqual({ error: "Not allowed" });
    expect(db.approveStaffEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("removeStaffAction", () => {
  it("removes the staff member within the session's store", async () => {
    expect(await removeStaffAction(SHOP, "staff-1")).toEqual({});
    expect(db.revokeStaff).toHaveBeenCalledWith(expect.anything(), "staff-1", "store-own");
  });

  it("reports when the staff member isn't the store's", async () => {
    db.getStaffMember.mockResolvedValueOnce(null as never);
    expect(await removeStaffAction(SHOP, "staff-x")).toEqual({ error: "Staff member not found" });
  });

  it("does nothing without a store", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await removeStaffAction(SHOP, "staff-1")).toEqual({ error: "Not allowed" });
    expect(db.revokeStaff).not.toHaveBeenCalled();
  });
});
