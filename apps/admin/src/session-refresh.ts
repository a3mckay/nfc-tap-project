// A manager's cookie records the role they had when it was signed. The edge
// middleware can't read the database, so once a cookie's role is more than
// LIVE_CHECK_MS old it sends the request through /api/session/refresh, which
// re-reads the role and re-signs the cookie (or signs them out). This keeps
// demotions, removals and promotions in force on every request — page loads,
// client-side navigation and route handlers — within a minute.
import type { AdminSession } from "./admin-auth.js";

export const LIVE_CHECK_MS = 60_000;
export const REFRESH_PATH = "/api/session/refresh";

export function needsLiveCheck(session: AdminSession, now = Date.now()): boolean {
  if (session.role !== "manager") return false;
  return !(now - (session.checkedAt ?? 0) < LIVE_CHECK_MS);
}

// A same-site path to return to, or "/" for anything that could leave the site.
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
