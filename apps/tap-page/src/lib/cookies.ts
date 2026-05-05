import { createHmac, timingSafeEqual } from "node:crypto";

export const CUSTOMER_COOKIE = "nfc_customer";
export const SESSION_COOKIE  = "nfc_session";

// Signed cookie format: "<customerId>.<base64url-hmac-sha256>"
// HMAC keyed with COOKIE_SECRET prevents tampering — no DB lookup needed per request.
export function signCustomerCookie(customerId: string): string {
  const secret = requireSecret();
  const sig = createHmac("sha256", secret).update(customerId).digest("base64url");
  return `${customerId}.${sig}`;
}

export function verifyCustomerCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const customerId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const secret = process.env.COOKIE_SECRET;
  if (!secret) return null;
  const expected = createHmac("sha256", secret).update(customerId).digest("base64url");
  // timingSafeEqual requires equal-length buffers
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return customerId;
}

function requireSecret(): string {
  const s = process.env.COOKIE_SECRET;
  if (!s) throw new Error("COOKIE_SECRET environment variable is required");
  return s;
}
