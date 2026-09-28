// Resolves which store a server action may act on, from the verified admin
// session — never from the client-supplied `shop` alone. Server actions can be
// invoked with arbitrary arguments, so store-role admins are pinned to their
// own store here; super admins may act on whichever shop they request; staff
// never get a store.

import { cookies } from "next/headers";
import { getStoreById, getStoreByDomain, type Store } from "@nfc/db";
import { verifySession, COOKIE_NAME, type AdminSession } from "./admin-auth.js";

type Pool = Parameters<typeof getStoreById>[0];

export interface StoreLookup {
  byId(id: string): Promise<Store | null>;
  byDomain(domain: string): Promise<Store | null>;
}

export async function resolveStoreForSession(
  session: AdminSession | null,
  requestedShop: string,
  lookup: StoreLookup,
): Promise<Store | null> {
  if (!session || session.role === "staff") return null;
  if (session.role === "store") return lookup.byId(session.storeId);
  if (!requestedShop) return null;
  return lookup.byDomain(requestedShop);
}

// The verified admin session for the current request, or null.
export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE_NAME)?.value);
}

export async function getActionStore(pool: Pool, requestedShop: string): Promise<Store | null> {
  const session = await getAdminSession();
  return resolveStoreForSession(session, requestedShop, {
    byId: (id) => getStoreById(pool, id),
    byDomain: (domain) => getStoreByDomain(pool, domain),
  });
}
