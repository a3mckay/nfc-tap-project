// "Goes great with" (founder, 2026-11-16): after Generate (or "Find again"),
// pairings are picked from the product's fact sheet and the store's catalog.
// A failure never blocks a save.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  getProductById: vi.fn(),
  getProductFacts: vi.fn(),
  getSpecSetup: vi.fn(),
  getPairingCatalog: vi.fn(),
  replacePairings: vi.fn(),
}));
vi.mock("@nfc/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@nfc/db")>();
  return { specCategoryFor: real.specCategoryFor, canPair: real.canPair, MAX_PAIRINGS: 3, ...db };
});
const askForPairings = vi.hoisted(() => vi.fn());
vi.mock("@/lib/pairings.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("../src/lib/pairings.js")>()), askForPairings }));

const { refreshPairings } = await import("../src/lib/refresh-pairings.js");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test";
  db.getProductById.mockResolvedValue({ id: "p-1", store_id: "store-1", title: "Bromeliad Ocean Mist", product_type: "Plants" });
  db.getSpecSetup.mockResolvedValue({ storeIndustry: "plants", override: null, productType: "Plants", title: "Bromeliad Ocean Mist" });
  db.getProductFacts.mockResolvedValue([{ topic: "pests", fact: "Gets mealybugs", source_url: "https://plants.ces.ncsu.edu/x/", source_kind: "reference" }]);
  db.getPairingCatalog.mockResolvedValue([{ id: "soap", title: "Insecticidal Soap", vendor: null, product_type: "Pest control", category: "garden_care", description: "" }]);
  askForPairings.mockResolvedValue([{ item: "c1", fact: 1, reason: "Bromeliads can get mealybugs." }]);
});

describe("refreshPairings", () => {
  it("picks pairings from the fact sheet and the catalog, and saves them", async () => {
    await refreshPairings({} as never, "store-1", "p-1");
    expect(db.getPairingCatalog).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1");
    expect(db.replacePairings).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", [
      { paired_product_id: "soap", reason: "Bromeliads can get mealybugs.", source_url: "https://plants.ces.ncsu.edu/x/", source_kind: "reference" },
    ]);
  });

  it("does nothing for another store's product or without an API key", async () => {
    db.getProductById.mockResolvedValue({ id: "p-1", store_id: "store-2", title: "x", product_type: null });
    await refreshPairings({} as never, "store-1", "p-1");
    delete process.env.ANTHROPIC_API_KEY;
    await refreshPairings({} as never, "store-1", "p-1");
    expect(db.replacePairings).not.toHaveBeenCalled();
  });

  it("keeps the old pairings if the model fails, and never throws", async () => {
    askForPairings.mockRejectedValue(new Error("overloaded"));
    await expect(refreshPairings({} as never, "store-1", "p-1")).resolves.toBeUndefined();
    expect(db.replacePairings).not.toHaveBeenCalled();
  });
});
