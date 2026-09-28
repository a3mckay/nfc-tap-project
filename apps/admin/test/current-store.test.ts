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

function fakeLookup() {
  return {
    byId:     vi.fn(async (id: string) => [own, other].find((s) => s.id === id) ?? null),
    byDomain: vi.fn(async (d: string) => [own, other].find((s) => s.shopify_shop_domain === d) ?? null),
  };
}

describe("resolveStoreForSession", () => {
  it("returns null when there is no session", async () => {
    const lookup = fakeLookup();
    expect(await resolveStoreForSession(null, "own.myshopify.com", lookup)).toBeNull();
    expect(lookup.byId).not.toHaveBeenCalled();
    expect(lookup.byDomain).not.toHaveBeenCalled();
  });

  it("gives a store admin their own store, ignoring the requested shop", async () => {
    const lookup = fakeLookup();
    const session = { role: "store", storeId: own.id, storeDomain: own.shopify_shop_domain } as const;
    expect(await resolveStoreForSession(session, "other.myshopify.com", lookup)).toBe(own);
    expect(lookup.byDomain).not.toHaveBeenCalled();
  });

  it("gives a super admin the requested shop", async () => {
    const lookup = fakeLookup();
    expect(await resolveStoreForSession({ role: "super" }, "other.myshopify.com", lookup)).toBe(other);
  });

  it("returns null for a super admin with no requested shop", async () => {
    const lookup = fakeLookup();
    expect(await resolveStoreForSession({ role: "super" }, "", lookup)).toBeNull();
    expect(lookup.byDomain).not.toHaveBeenCalled();
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
    expect(await getActionStore(pool, "other.myshopify.com")).toBe(own);
  });

  it("returns null without a session cookie", async () => {
    expect(await getActionStore(pool, "other.myshopify.com")).toBeNull();
  });

  it("returns null for a tampered session cookie", async () => {
    const forged = btoa(JSON.stringify({ role: "super" })) + ".not-a-real-signature";
    cookieJar.set(COOKIE_NAME, forged);
    expect(await getActionStore(pool, "other.myshopify.com")).toBeNull();
  });
});
