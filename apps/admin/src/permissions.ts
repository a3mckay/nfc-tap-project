// Who can do what in the admin (roles approved 2026-09-29). Checked by the
// middleware for pages and by getActionStore for every server action; the
// sidebar only uses it to hide what someone can't open.
import type { AdminSession } from "./admin-auth.js";

export type Permission =
  | "training"           // staff training notes
  | "content"            // customer product content, reviews
  | "progress"           // see the Staff page and training progress
  | "staff"              // add and remove staff
  | "assign_co_manager"  // make someone a co-manager (or back to staff)
  | "assign_manager"     // make someone a manager, or change/remove a manager
  | "catalog"            // products and tags
  | "marketing"          // offers and customer notifications
  | "analytics"
  | "store_settings"     // theme, settings, product matching, getting started
  | "billing"            // plan and billing
  | "all_stores";        // super admin: every store

const OWNER: Permission[] = [
  "training", "content", "progress", "staff", "assign_co_manager", "assign_manager",
  "catalog", "marketing", "analytics", "store_settings", "billing",
];
const MANAGER: Permission[] = [
  "training", "content", "progress", "staff", "assign_co_manager", "catalog", "marketing", "analytics",
];
const CO_MANAGER: Permission[] = ["training", "content", "progress"];

function permissionsOf(session: AdminSession | null): Permission[] {
  switch (session?.role) {
    case "super": return [...OWNER, "all_stores"];
    case "store": return OWNER;
    case "manager": return session.level === "manager" ? MANAGER : CO_MANAGER;
    default: return [];
  }
}

export function can(session: AdminSession | null, permission: Permission): boolean {
  return permissionsOf(session).includes(permission);
}

// Admin areas by path prefix. /enrichment/<id>/training is matched first, below.
const PAGES: [string, Permission][] = [
  ["/enrichment", "content"],
  ["/reviews", "content"],
  ["/staff", "progress"],
  ["/products", "catalog"],
  ["/tags", "catalog"],
  ["/offers", "marketing"],
  ["/notifications", "marketing"],
  ["/analytics", "analytics"],
  ["/theme", "store_settings"],
  ["/settings", "store_settings"],
  ["/canonical", "store_settings"],
  ["/onboarding", "store_settings"],
  ["/plan", "billing"],
  ["/stores", "all_stores"],
];

// The permission an admin page needs, or null for pages any signed-in admin may open.
export function permissionForPath(pathname: string): Permission | null {
  if (/^\/enrichment\/[^/]+\/training\/?$/.test(pathname)) return "training";
  for (const [prefix, permission] of PAGES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return permission;
  }
  return null;
}

// Where to send an owner, manager or co-manager who opens a page they can't use.
export function adminHomePath(session: Extract<AdminSession, { storeDomain: string }>): string {
  const shop = encodeURIComponent(session.storeDomain);
  return can(session, "catalog") ? `/tags?shop=${shop}` : `/enrichment?shop=${shop}`;
}
