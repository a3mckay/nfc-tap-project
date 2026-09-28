// PRD v4 §7 Step 13a: the admin Staff page acts only on the session's store.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  approveStaffEmail: vi.fn(async () => ({})),
  revokeStaff: vi.fn(async () => true),
}));
const getActionStore = vi.hoisted(() => vi.fn());

vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { approveStaffAction, removeStaffAction } = await import("../app/staff/actions.js");

const SHOP = "own.myshopify.com";

beforeEach(() => {
  vi.clearAllMocks();
  getActionStore.mockResolvedValue({ id: "store-own", shopify_shop_domain: SHOP });
  db.revokeStaff.mockResolvedValue(true);
});

describe("approveStaffAction", () => {
  it("approves a normalized email for the session's store", async () => {
    expect(await approveStaffAction(SHOP, " Sam@Example.com ", " Sam ")).toEqual({});
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), SHOP);
    expect(db.approveStaffEmail).toHaveBeenCalledWith(expect.anything(), "store-own", "sam@example.com", "Sam");
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
    expect(await approveStaffAction(SHOP, "sam@example.com", "")).toEqual({ error: "Store not found" });
    expect(db.approveStaffEmail).not.toHaveBeenCalled();
  });
});

describe("removeStaffAction", () => {
  it("removes the staff member within the session's store", async () => {
    expect(await removeStaffAction(SHOP, "staff-1")).toEqual({});
    expect(db.revokeStaff).toHaveBeenCalledWith(expect.anything(), "staff-1", "store-own");
  });

  it("reports when the staff member isn't the store's", async () => {
    db.revokeStaff.mockResolvedValue(false);
    expect(await removeStaffAction(SHOP, "staff-x")).toEqual({ error: "Staff member not found" });
  });

  it("does nothing without a store", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await removeStaffAction(SHOP, "staff-1")).toEqual({ error: "Store not found" });
    expect(db.revokeStaff).not.toHaveBeenCalled();
  });
});
