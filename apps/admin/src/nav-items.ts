// The admin menu (app/layout.tsx). Each link is shown only to roles with the
// permission it needs; empty groups are dropped. Home is for everyone.
import type { AdminSession } from "./admin-auth.js";
import { can, type Permission } from "./permissions.js";

type NavItem = [href: string, label: string, permission: Permission | null];

const MAIN_NAV: NavItem[][] = [
  [
    ["/", "Home", null],
    ["/questions", "Questions", "questions"],
    ["/products", "Products", "catalog"],
    ["/enrichment", "Content", "content"],
    ["/tags", "Tags", "catalog"],
    ["/staff", "Staff", "progress"],
    ["/policies", "Store policies", "policies"],
  ],
  [
    ["/reviews", "Reviews", "content"],
    ["/offers", "Offers", "marketing"],
  ],
  [
    ["/notifications", "Notifications", "marketing"],
    ["/analytics", "Analytics", "analytics"],
    ["/theme", "Theme", "store_settings"],
    ["/canonical", "Product Matching", "store_settings"],
  ],
];

const FOOTER_NAV: NavItem[] = [
  ["/plan", "Plan", "billing"],
  ["/settings", "Settings", "store_settings"],
  ["/onboarding", "Getting Started", "store_settings"],
];

const allowed = (session: AdminSession) => (item: NavItem) => item[2] === null || can(session, item[2]);
const link = ([href, label]: NavItem): [string, string] => [href, label];

export function mainNavFor(session: AdminSession): [string, string][][] {
  return MAIN_NAV.map((group) => group.filter(allowed(session)).map(link)).filter((group) => group.length > 0);
}

export function footerNavFor(session: AdminSession): [string, string][] {
  return FOOTER_NAV.filter(allowed(session)).map(link);
}
