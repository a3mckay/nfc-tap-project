// Brand detection calls paid APIs, so only store owners and super admins may run it.
import { describe, it, expect, vi, beforeEach } from "vitest";

const getAdminSession = vi.hoisted(() => vi.fn());
vi.mock("@/current-store.js", () => ({ getAdminSession }));
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));
const fetchSpy = vi.fn(async () => { throw new Error("network disabled in test"); });

const { detectBrandAction } = await import("../app/theme/detect-brand-action.js");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchSpy);
});

describe("detectBrandAction", () => {
  it("refuses staff and anonymous callers before calling any external service", async () => {
    for (const session of [{ role: "staff", staffId: "st", storeId: "s", storeDomain: "d", exp: Date.now() + 1000 }, null]) {
      getAdminSession.mockResolvedValue(session);
      expect(await detectBrandAction("https://example.com")).toEqual({ error: "Not allowed" });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets a store owner through to the detection step", async () => {
    getAdminSession.mockResolvedValue({ role: "store", storeId: "s", storeDomain: "d" });
    await detectBrandAction("https://example.com");
    expect(fetchSpy).toHaveBeenCalled();
  });
});
