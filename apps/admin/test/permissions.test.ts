// Who can do what in the admin: owner, manager, co-manager (approved 2026-09-29).
import { describe, it, expect } from "vitest";
import { can, permissionForPath, adminHomePath, type Permission } from "../src/permissions.js";
import type { AdminSession } from "../src/admin-auth.js";

const exp = Date.now() + 60_000;
const superAdmin: AdminSession = { role: "super" };
const owner: AdminSession = { role: "store", storeId: "s", storeDomain: "d" };
const manager: AdminSession = { role: "manager", level: "manager", staffId: "m", storeId: "s", storeDomain: "d", exp };
const coManager: AdminSession = { role: "manager", level: "co_manager", staffId: "c", storeId: "s", storeDomain: "d", exp };
const staff: AdminSession = { role: "staff", staffId: "x", storeId: "s", storeDomain: "d", exp };

const ALL: Permission[] = [
  "training", "content", "progress", "staff", "assign_co_manager", "assign_manager",
  "catalog", "marketing", "analytics", "store_settings", "billing", "all_stores",
];
const allowed = (s: AdminSession | null) => ALL.filter((p) => can(s, p));

describe("can", () => {
  it("gives super admins everything", () => {
    expect(allowed(superAdmin)).toEqual(ALL);
  });

  it("gives owners everything in their store", () => {
    expect(allowed(owner)).toEqual(ALL.filter((p) => p !== "all_stores"));
  });

  it("gives managers the day-to-day, but not settings, billing or making managers", () => {
    expect(allowed(manager)).toEqual([
      "training", "content", "progress", "staff", "assign_co_manager", "catalog", "marketing", "analytics",
    ]);
  });

  it("gives co-managers training notes, product content and a view of progress", () => {
    expect(allowed(coManager)).toEqual(["training", "content", "progress"]);
  });

  it("gives staff and anonymous sessions nothing", () => {
    expect(allowed(staff)).toEqual([]);
    expect(allowed(null)).toEqual([]);
  });
});

describe("permissionForPath", () => {
  it("maps each admin area to the permission it needs", () => {
    expect(permissionForPath("/enrichment/p-1/training")).toBe("training");
    expect(permissionForPath("/enrichment/p-1")).toBe("content");
    expect(permissionForPath("/enrichment")).toBe("content");
    expect(permissionForPath("/reviews/pending")).toBe("content");
    expect(permissionForPath("/staff")).toBe("progress");
    expect(permissionForPath("/products/import")).toBe("catalog");
    expect(permissionForPath("/tags/t-1")).toBe("catalog");
    expect(permissionForPath("/offers")).toBe("marketing");
    expect(permissionForPath("/notifications")).toBe("marketing");
    expect(permissionForPath("/analytics")).toBe("analytics");
    expect(permissionForPath("/theme")).toBe("store_settings");
    expect(permissionForPath("/settings")).toBe("store_settings");
    expect(permissionForPath("/canonical")).toBe("store_settings");
    expect(permissionForPath("/onboarding")).toBe("store_settings");
    expect(permissionForPath("/plan")).toBe("billing");
    expect(permissionForPath("/stores")).toBe("all_stores");
  });

  it("doesn't confuse similar prefixes", () => {
    expect(permissionForPath("/staffing")).toBeNull();
    expect(permissionForPath("/")).toBeNull();
  });
});

describe("adminHomePath", () => {
  it("sends each role to a page they can open", () => {
    expect(adminHomePath(owner)).toBe("/tags?shop=d");
    expect(adminHomePath(manager)).toBe("/tags?shop=d");
    expect(adminHomePath(coManager)).toBe("/enrichment?shop=d");
  });
});
