// The admin menu: Home first for everyone, then each role's sections.
import { describe, it, expect } from "vitest";
import type { AdminSession } from "../src/admin-auth.js";
import { mainNavFor } from "../src/nav-items.js";

const exp = Date.now() + 60_000;
const owner: AdminSession = { role: "store", storeId: "s", storeDomain: "d" };
const coManager: AdminSession = { role: "manager", level: "co_manager", staffId: "c", storeId: "s", storeDomain: "d", exp };

const labels = (s: AdminSession) => mainNavFor(s).map((group) => group.map(([, label]) => label));

describe("mainNavFor", () => {
  it("starts with Home, which links to the dashboard", () => {
    for (const who of [owner, coManager, { role: "super" } as AdminSession]) {
      expect(mainNavFor(who)[0]![0]).toEqual(["/", "Home"]);
    }
  });

  it("shows each role only the sections it can open, dropping empty groups", () => {
    expect(labels(owner)[0]).toEqual(["Home", "Questions", "Products", "Content", "Tags", "Staff", "Store policies"]);
    expect(labels(coManager).flat()).not.toContain("Store policies");
    expect(labels(coManager).every((g) => g.length > 0)).toBe(true);
  });
});
