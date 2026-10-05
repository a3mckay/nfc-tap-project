// PRD v4 §7 Step 15l: editing a product's spec fields and the store's industry.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  saveOwnerSpecs: vi.fn(async () => {}),
  setProductSpecCategory: vi.fn(async () => {}),
  setStoreIndustry: vi.fn(async () => {}),
  getSpecSetup: vi.fn(async () => ({ storeIndustry: null, override: null, productType: "Cannabis Flower", title: "Animal Face" })),
}));
const getActionStore = vi.hoisted(() => vi.fn());
vi.mock("@nfc/db", async (importOriginal) => ({ ...(await importOriginal<typeof import("@nfc/db")>()), ...db }));
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const checkProductNotes = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/check-product.js", () => ({ checkProductNotes }));

const { saveSpecsAction } = await import("../app/enrichment/[product_id]/specActions.js");
const { setIndustryAction } = await import("../app/settings/actions.js");

beforeEach(() => { vi.clearAllMocks(); getActionStore.mockResolvedValue({ id: "store-1" }); });

describe("saveSpecsAction", () => {
  it("needs the content permission", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await saveSpecsAction("shop", "p-1", "cannabis", { thc: "22%" })).toEqual({ error: "Not allowed" });
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "shop", "content");
  });

  it("saves the category override and only the fields in that category's template", async () => {
    expect(await saveSpecsAction("shop", "p-1", "cannabis", { thc: " 22% ", nonsense: "x" })).toEqual({});
    expect(db.setProductSpecCategory).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", "cannabis");
    expect(db.saveOwnerSpecs).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", { thc: " 22% " });
    expect(checkProductNotes).toHaveBeenCalled();
  });

  it("on Automatic, clears the override and saves the detected category's fields", async () => {
    await saveSpecsAction("shop", "p-1", null, { thc: "22%", fabric: "x" });
    expect(db.setProductSpecCategory).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", null);
    expect(db.saveOwnerSpecs).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", { thc: "22%" });
  });

  it("rejects unknown categories", async () => {
    expect(await saveSpecsAction("shop", "p-1", "spaceships", {})).toEqual({ error: "Unknown category" });
  });
});

describe("setIndustryAction", () => {
  it("is for the store-settings permission and accepts known categories or none", async () => {
    expect(await setIndustryAction("shop", "wine")).toEqual({});
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "shop", "store_settings");
    expect(db.setStoreIndustry).toHaveBeenCalledWith(expect.anything(), "store-1", "wine");
    expect(await setIndustryAction("shop", "")).toEqual({});
    expect(db.setStoreIndustry).toHaveBeenLastCalledWith(expect.anything(), "store-1", null);
    expect(await setIndustryAction("shop", "spaceships")).toEqual({ error: "Unknown industry" });
  });
});
