import { describe, it, expect } from "vitest";
import { signSession, verifySession, staffSession, STAFF_SESSION_DAYS } from "../src/admin-auth.js";

describe("staff sessions", () => {
  it("round-trips a staff session that hasn't expired", async () => {
    const s = staffSession({ staffId: "st-1", storeId: "store-1", storeDomain: "own.myshopify.com" });
    expect(await verifySession(await signSession(s))).toEqual(s);
  });

  it("lasts STAFF_SESSION_DAYS (30 days)", () => {
    const now = Date.UTC(2026, 8, 28);
    const s = staffSession({ staffId: "st-1", storeId: "store-1", storeDomain: "d" }, now);
    expect(STAFF_SESSION_DAYS).toBe(30);
    expect(s.exp).toBe(now + 30 * 24 * 60 * 60 * 1000);
  });

  it("rejects an expired staff session even with a valid signature", async () => {
    const s = staffSession({ staffId: "st-1", storeId: "store-1", storeDomain: "d" }, Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(await verifySession(await signSession(s))).toBeNull();
  });

  it("leaves store and super sessions unchanged", async () => {
    const store = { role: "store", storeId: "store-1", storeDomain: "d" } as const;
    expect(await verifySession(await signSession(store))).toEqual(store);
    expect(await verifySession(await signSession({ role: "super" }))).toEqual({ role: "super" });
  });
});
