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
  | "policies"           // store policies the AI assistant answers from (D48)
  | "questions"          // the Questions tab: customer questions, answers (D7, D11)
  | "store_settings"     // theme, settings, product matching, getting started
  | "billing"            // plan and billing
  | "all_stores";        // super admin: every store

const OWNER: Permission[] = [
  "training", "content", "progress", "staff", "assign_co_manager", "assign_manager",
  "catalog", "marketing", "analytics", "policies", "questions", "store_settings", "billing",
];
const MANAGER: Permission[] = [
  "training", "content", "progress", "staff", "assign_co_manager", "catalog", "marketing", "analytics", "policies", "questions",
];
const CO_MANAGER: Permission[] = ["training", "content", "progress", "questions"];

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
  ["/policies", "policies"],
  ["/questions", "questions"],
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

// The admin home page (PRD v4 §7 Step 15i, D45): where owners, managers and
// co-managers land after sign-in, and where they're sent from a page they can't use.
export function adminHomePath(session: Extract<AdminSession, { storeDomain: string }>): string {
  return `/?shop=${encodeURIComponent(session.storeDomain)}`;
}

// The layout re-checks a manager's live role on every page (the middleware only
// sees the cookie). `cookie` is the signed session; `live` the same session with
// the role now in the database (null if they're no longer a manager or
// co-manager). Returns where to send them, or null to carry on.
export function accessRedirect(
  cookie: AdminSession | null,
  live: AdminSession | null,
  pathname: string,
): string | null {
  if (cookie?.role !== "manager") return null;
  if (!live || live.role !== "manager") return "/login?error=role";
  const needed = permissionForPath(pathname);
  return needed && !can(live, needed) ? adminHomePath(live) : null;
}

type StaffRoleName = "staff" | "co_manager" | "manager";

// What a viewer may do to one row on the Staff page: which roles they can pick
// (empty = no role control) and whether they can remove the person.
export function staffRowControls(
  viewer: AdminSession | null,
  rowRole: StaffRoleName,
): { roles: StaffRoleName[]; canRemove: boolean } {
  const assignManager = can(viewer, "assign_manager");
  if (rowRole === "manager" && !assignManager) return { roles: [], canRemove: false };
  const roles: StaffRoleName[] = assignManager
    ? ["staff", "co_manager", "manager"]
    : can(viewer, "assign_co_manager") ? ["staff", "co_manager"] : [];
  return { roles, canRemove: can(viewer, "staff") };
}
