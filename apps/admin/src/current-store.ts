// Resolves which store a server action may act on, from the verified admin
// session — never from the client-supplied `shop` alone — and only if the
// session's role allows `permission` (src/permissions.ts). Server actions can be
// invoked with arbitrary arguments, so:
// - owners and managers are pinned to their own store;
// - super admins may act on whichever shop they request;
// - managers' roles are re-read from the database on every call, so a demotion
//   or removal takes effect at once;
// - staff never get a store.

import { cookies } from "next/headers";
import { getStoreById, getStoreByDomain, getStaffMember, type Store, type StaffRole } from "@nfc/db";
import { verifySession, COOKIE_NAME, type AdminSession } from "./admin-auth.js";
import { can, type Permission } from "./permissions.js";

type Pool = Parameters<typeof getStoreById>[0];

export interface StoreLookup {
  byId(id: string): Promise<Store | null>;
  byDomain(domain: string): Promise<Store | null>;
  staffRole(staffId: string, storeId: string): Promise<StaffRole | null>;
}

// For a manager session, the session with the role currently in the database;
// null if they're no longer a manager or co-manager. Other sessions unchanged.
export async function refreshSession(
  session: AdminSession | null,
  staffRole: StoreLookup["staffRole"],
): Promise<AdminSession | null> {
  if (session?.role !== "manager") return session;
  const role = await staffRole(session.staffId, session.storeId);
  return role === "manager" || role === "co_manager" ? { ...session, level: role } : null;
}

export async function resolveStoreForSession(
  session: AdminSession | null,
  requestedShop: string,
  permission: Permission,
  lookup: StoreLookup,
): Promise<Store | null> {
  const current = await refreshSession(session, lookup.staffRole);
  if (!current || !can(current, permission)) return null;
  if (current.role === "store" || current.role === "manager") return lookup.byId(current.storeId);
  if (!requestedShop) return null;
  return lookup.byDomain(requestedShop);
}

// The verified admin session for the current request, or null. For managers
// this is the cookie's view; use getCurrentAdminSession for their live role.
export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE_NAME)?.value);
}

function lookupFor(pool: Pool): StoreLookup {
  return {
    byId: (id) => getStoreById(pool, id),
    byDomain: (domain) => getStoreByDomain(pool, domain),
    staffRole: async (staffId, storeId) => (await getStaffMember(pool, staffId, storeId))?.role ?? null,
  };
}

// The current session with a manager's role re-read from the database.
export async function getCurrentAdminSession(pool: Pool): Promise<AdminSession | null> {
  return refreshSession(await getAdminSession(), lookupFor(pool).staffRole);
}

export async function getActionStore(
  pool: Pool,
  requestedShop: string,
  permission: Permission,
): Promise<Store | null> {
  return resolveStoreForSession(await getAdminSession(), requestedShop, permission, lookupFor(pool));
}
