// The tap page's staff cookie (PRD v4 §7 Step 13c). Set by /staff/handoff after
// a staff member or store owner signs in on the admin; lets the tap page show
// them the training view. Signed with COOKIE_SECRET, expires after 30 days.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { TapPrincipal } from "@nfc/db";

export const STAFF_COOKIE = "nfc_staff";
export const STAFF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function hmac(data: string): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error("COOKIE_SECRET environment variable is required");
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signStaffCookie(principal: TapPrincipal, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ ...principal, exp: now + STAFF_COOKIE_MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifyStaffCookie(value: string | undefined, now = Date.now()): TapPrincipal | null {
  if (!value || !process.env.COOKIE_SECRET) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = value.slice(0, dot);
  const sig = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(hmac(payload));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  try {
    const { exp, ...p } = JSON.parse(Buffer.from(payload, "base64url").toString()) as TapPrincipal & { exp: number };
    if (!(exp > now)) return null;
    if (p.kind === "staff") return { kind: "staff", staffId: p.staffId, storeId: p.storeId };
    if (p.kind === "owner") return { kind: "owner", storeAdminId: p.storeAdminId, storeId: p.storeId };
    return null;
  } catch {
    return null;
  }
}

// Must match the admin's hashSignInToken (SHA-256, base64url, no padding).
export function hashHandoffToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

// `next dev` runs the admin on port 3000; production is admin.tapshelf.co.
export function adminBaseUrl(): string {
  const fallback = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://admin.tapshelf.co";
  return (process.env.ADMIN_BASE_URL ?? fallback).replace(/\/+$/, "");
}

// Only same-site admin paths: "/..." but not "//host" or "/\host".
export function safeReturnPath(path: string): string {
  return /^\/(?![/\\])/.test(path) ? path : "/";
}
