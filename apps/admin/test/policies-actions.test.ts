// PRD v4 §7 Step 15j: owners and managers save the store's policies (D48).
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  saveStorePolicies: vi.fn(async () => {}),
}));
const getActionStore = vi.hoisted(() => vi.fn());
vi.mock("@nfc/db", async (importOriginal) => ({ ...(await importOriginal<typeof import("@nfc/db")>()), ...db }));
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveStorePoliciesAction } = await import("../app/policies/actions.js");

beforeEach(() => vi.clearAllMocks());

describe("saveStorePoliciesAction", () => {
  it("needs the policies permission", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await saveStorePoliciesAction("own.myshopify.com", { returns: "30 days" })).toEqual({ error: "Not allowed" });
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "own.myshopify.com", "policies");
    expect(db.saveStorePolicies).not.toHaveBeenCalled();
  });

  it("saves the acting store's policies", async () => {
    getActionStore.mockResolvedValue({ id: "store-1" });
    expect(await saveStorePoliciesAction("own.myshopify.com", { returns: "30 days", delivery: "" })).toEqual({});
    expect(db.saveStorePolicies).toHaveBeenCalledWith(expect.anything(), "store-1", { returns: "30 days", delivery: "" });
  });

  it("rejects very long policies", async () => {
    getActionStore.mockResolvedValue({ id: "store-1" });
    expect(await saveStorePoliciesAction("own.myshopify.com", { returns: "x".repeat(1201) })).toEqual({ error: "Keep each policy under 1,200 characters" });
  });
});
