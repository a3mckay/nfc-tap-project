// Owners set the store's display name in Settings.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  setStoreName: vi.fn(async () => {}),
  setDataSharingConsent: vi.fn(), setStorePlatform: vi.fn(), setStoreIndustry: vi.fn(), SPEC_CATEGORIES: [],
}));
const getActionStore = vi.hoisted(() => vi.fn());
vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { setStoreNameAction } = await import("../app/settings/actions.js");

beforeEach(() => {
  vi.clearAllMocks();
  getActionStore.mockResolvedValue({ id: "store-1" });
});

describe("setStoreNameAction", () => {
  it("saves the name for a user allowed to change store settings", async () => {
    expect(await setStoreNameAction("own.myshopify.com", "Queen West Shoes")).toEqual({});
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "own.myshopify.com", "store_settings");
    expect(db.setStoreName).toHaveBeenCalledWith(expect.anything(), "store-1", "Queen West Shoes");
  });

  it("refuses users who can't change store settings", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await setStoreNameAction("own.myshopify.com", "x")).toEqual({ error: "Store not found" });
    expect(db.setStoreName).not.toHaveBeenCalled();
  });

  it("refuses names over 60 characters", async () => {
    expect(await setStoreNameAction("own.myshopify.com", "a".repeat(61))).toEqual({ error: "Keep the name to 60 characters or fewer." });
    expect(db.setStoreName).not.toHaveBeenCalled();
  });
});
