// Creating stores is super-admin only; the action must check, not just the page.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ getPool: vi.fn(() => ({})), createManualStore: vi.fn(async () => ({})) }));
const getAdminSession = vi.hoisted(() => vi.fn());
vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getAdminSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createStoreAction } = await import("../app/stores/actions.js");

function form(domain: string) {
  const f = new FormData();
  f.set("domain", domain);
  f.set("platform", "other");
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("createStoreAction", () => {
  it("creates a store for a super admin", async () => {
    getAdminSession.mockResolvedValue({ role: "super" });
    expect(await createStoreAction(form("new.myshopify.com"))).toEqual({});
    expect(db.createManualStore).toHaveBeenCalled();
  });

  it("refuses store admins, staff and anonymous callers", async () => {
    for (const session of [
      { role: "store", storeId: "s", storeDomain: "d" },
      { role: "staff", staffId: "st", storeId: "s", storeDomain: "d", exp: Date.now() + 1000 },
      null,
    ]) {
      getAdminSession.mockResolvedValue(session);
      expect(await createStoreAction(form("new.myshopify.com"))).toEqual({ error: "Not allowed" });
    }
    expect(db.createManualStore).not.toHaveBeenCalled();
  });
});
