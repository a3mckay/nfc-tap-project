import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Store } from "@nfc/db";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
  }),
}));

const { resolveStoreForSession, getActionStore } = await import("../src/current-store.js");
const { signSession, COOKIE_NAME } = await import("../src/admin-auth.js");

const own   = { id: "store-own",   shopify_shop_domain: "own.myshopify.com" } as Store;
const other = { id: "store-other", shopify_shop_domain: "other.myshopify.com" } as Store;

function fakeLookup(staffRole: "staff" | "co_manager" | "manager" | null = "manager") {
  return {
    byId:     vi.fn(async (id: string) => [own, other].find((s) => s.id === id) ?? null),
    byDomain: vi.fn(async (d: string) => [own, other].find((s) => s.shopify_shop_domain === d) ?? null),
    staffRole: vi.fn(async (_staffId: string, _storeId: string) => staffRole),
  };
}

describe("resolveStoreForSession", () => {
  it("returns null when there is no session", async () => {
    const lookup = fakeLookup();
    expect(await resolveStoreForSession(null, "own.myshopify.com", "content", lookup)).toBeNull();
    expect(lookup.byId).not.toHaveBeenCalled();
    expect(lookup.byDomain).not.toHaveBeenCalled();
  });

  it("gives a store admin their own store, ignoring the requested shop", async () => {
    const lookup = fakeLookup();
    const session = { role: "store", storeId: own.id, storeDomain: own.shopify_shop_domain } as const;
    expect(await resolveStoreForSession(session, "other.myshopify.com", "content", lookup)).toBe(own);
    expect(lookup.byDomain).not.toHaveBeenCalled();
  });

  it("gives a super admin the requested shop", async () => {
    const lookup = fakeLookup();
    expect(await resolveStoreForSession({ role: "super" }, "other.myshopify.com", "content", lookup)).toBe(other);
  });

  it("gives a staff member no store, whatever shop is requested", async () => {
    const lookup = fakeLookup();
    const staff = { role: "staff", staffId: "st-1", storeId: own.id, storeDomain: own.shopify_shop_domain, exp: Date.now() + 60_000 } as const;
    expect(await resolveStoreForSession(staff, "own.myshopify.com", "content", lookup)).toBeNull();
    expect(await resolveStoreForSession(staff, "other.myshopify.com", "content", lookup)).toBeNull();
    expect(lookup.byId).not.toHaveBeenCalled();
    expect(lookup.byDomain).not.toHaveBeenCalled();
  });

  it("returns null for a super admin with no requested shop", async () => {
    const lookup = fakeLookup();
    expect(await resolveStoreForSession({ role: "super" }, "", "content", lookup)).toBeNull();
    expect(lookup.byDomain).not.toHaveBeenCalled();
  });
});

describe("resolveStoreForSession for managers", () => {
  const exp = Date.now() + 60_000;
  const manager = { role: "manager", level: "manager", staffId: "m-1", storeId: own.id, storeDomain: own.shopify_shop_domain, exp } as const;
  const coManager = { ...manager, level: "co_manager" } as const;

  it("gives a manager their own store for things they're allowed to do", async () => {
    const lookup = fakeLookup("manager");
    expect(await resolveStoreForSession(manager, "other.myshopify.com", "catalog", lookup)).toBe(own);
    expect(lookup.staffRole).toHaveBeenCalledWith("m-1", own.id);
    expect(lookup.byDomain).not.toHaveBeenCalled();
  });

  it("refuses what the role doesn't allow", async () => {
    expect(await resolveStoreForSession(manager, "", "store_settings", fakeLookup("manager"))).toBeNull();
    expect(await resolveStoreForSession(coManager, "", "catalog", fakeLookup("co_manager"))).toBeNull();
    expect(await resolveStoreForSession(coManager, "", "training", fakeLookup("co_manager"))).toBe(own);
  });

  it("uses the role in the database, so a demotion takes effect straight away", async () => {
    // Cookie still says manager; the owner has since made them a co-manager.
    expect(await resolveStoreForSession(manager, "", "catalog", fakeLookup("co_manager"))).toBeNull();
    expect(await resolveStoreForSession(manager, "", "training", fakeLookup("co_manager"))).toBe(own);
    // Back to plain staff, or removed from the list.
    expect(await resolveStoreForSession(manager, "", "training", fakeLookup("staff"))).toBeNull();
    expect(await resolveStoreForSession(manager, "", "training", fakeLookup(null))).toBeNull();
  });
});

describe("resolveStoreForSession permissions for owners and super admins", () => {
  it("refuses super-admin-only things to owners", async () => {
    const session = { role: "store", storeId: own.id, storeDomain: own.shopify_shop_domain } as const;
    expect(await resolveStoreForSession(session, "", "all_stores", fakeLookup())).toBeNull();
  });
});

describe("getActionStore", () => {
  // Minimal pool double: getStoreById / getStoreByDomain issue a single query with one param
  const pool = {
    query: vi.fn(async (_sql: string, [key]: [string]) => ({
      rows: [own, other].filter((s) => s.id === key || s.shopify_shop_domain === key),
    })),
  } as unknown as Parameters<typeof getActionStore>[0];

  beforeEach(() => cookieJar.clear());

  it("reads the store admin's own store from the signed session cookie", async () => {
    cookieJar.set(COOKIE_NAME, await signSession({ role: "store", storeId: own.id, storeDomain: own.shopify_shop_domain }));
    expect(await getActionStore(pool, "other.myshopify.com", "content")).toBe(own);
  });

  it("returns null without a session cookie", async () => {
    expect(await getActionStore(pool, "other.myshopify.com", "content")).toBeNull();
  });

  it("returns null for a tampered session cookie", async () => {
    const forged = btoa(JSON.stringify({ role: "super" })) + ".not-a-real-signature";
    cookieJar.set(COOKIE_NAME, forged);
    expect(await getActionStore(pool, "other.myshopify.com", "content")).toBeNull();
  });
});
