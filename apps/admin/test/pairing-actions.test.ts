// "Goes great with" (founder, 2026-11-16): owners, managers and co-managers
// ("content") can remove a pairing or ask the AI to find pairings again.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ getPool: vi.fn(() => ({})), getProductById: vi.fn(), removePairing: vi.fn(async () => true) }));
const getActionStore = vi.hoisted(() => vi.fn());
const refreshPairings = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("@/lib/refresh-pairings.js", () => ({ refreshPairings }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { removePairingAction, findPairingsAction } = await import("../app/enrichment/[product_id]/pairingActions.js");

beforeEach(() => {
  vi.clearAllMocks();
  getActionStore.mockResolvedValue({ id: "store-1" });
  db.getProductById.mockResolvedValue({ id: "p-1", store_id: "store-1" });
});

describe("pairing actions", () => {
  it("need the content permission", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await removePairingAction("own.myshopify.com", "p-1", "soap")).toEqual({ error: "Not allowed" });
    expect(await findPairingsAction("own.myshopify.com", "p-1")).toEqual({ error: "Not allowed" });
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "own.myshopify.com", "content");
    expect(db.removePairing).not.toHaveBeenCalled();
    expect(refreshPairings).not.toHaveBeenCalled();
  });

  it("removes a pairing from the store's product", async () => {
    expect(await removePairingAction("own.myshopify.com", "p-1", "soap")).toEqual({});
    expect(db.removePairing).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", "soap");
  });

  it("finds pairings again for the store's own product only", async () => {
    expect(await findPairingsAction("own.myshopify.com", "p-1")).toEqual({});
    expect(refreshPairings).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1");
    db.getProductById.mockResolvedValue({ id: "p-1", store_id: "store-2" });
    expect(await findPairingsAction("own.myshopify.com", "p-1")).toEqual({ error: "Product not found" });
  });
});
