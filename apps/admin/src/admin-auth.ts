// Edge-safe admin session cookie — signed with HMAC-SHA256 via Web Crypto.
//
// Cookie format (new): base64(JSON.stringify(session)).base64url(sig)
// Legacy format:       "authenticated".base64url(sig) → treated as super session

export const COOKIE_NAME = "nfc_admin";

export type AdminSession =
  | { role: "super" }
  | { role: "store"; storeId: string; storeDomain: string }
  | ManagerSession
  | StaffSession;

// A manager or co-manager: someone on the Staff list promoted by the owner (or,
// for co-managers, by a manager), signed in with their own password. What they
// can do is in src/permissions.ts. Expires like a staff session.
export interface ManagerSession {
  role: "manager";
  level: "manager" | "co_manager";
  staffId: string;
  storeId: string;
  storeDomain: string;
  exp: number;
}

// Staff (PRD v4 §7 Step 13) can only reach the staff home page. Their sessions
// carry an expiry (ms since epoch) that verifySession enforces.
export interface StaffSession {
  role: "staff";
  staffId: string;
  storeId: string;
  storeDomain: string;
  exp: number;
}

export const STAFF_SESSION_DAYS = 30;
export const STAFF_SESSION_MAX_AGE_SECONDS = STAFF_SESSION_DAYS * 24 * 60 * 60;

export function staffSession(
  who: { staffId: string; storeId: string; storeDomain: string },
  now = Date.now(),
): StaffSession {
  return { role: "staff", ...who, exp: now + STAFF_SESSION_MAX_AGE_SECONDS * 1000 };
}

function secret(): string {
  return process.env.ADMIN_COOKIE_SECRET ?? "dev-admin-secret-change-in-prod";
}

function b64url(buf: ArrayBufferLike): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function hmac(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return b64url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(session: AdminSession): Promise<string> {
  const payload = btoa(JSON.stringify(session));
  const sig = await hmac(payload, secret());
  return `${payload}.${sig}`;
}

export async function verifySession(value: string | undefined): Promise<AdminSession | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = await hmac(payload, secret());
  if (!timingSafeEqual(sig, expected)) return null;

  // Legacy super-admin cookie: literal "authenticated" payload
  if (payload === "authenticated") return { role: "super" };

  let session: AdminSession;
  try {
    session = JSON.parse(atob(payload)) as AdminSession;
  } catch {
    return null;
  }
  if ((session.role === "staff" || session.role === "manager") && !(session.exp > Date.now())) return null;
  return session;
}

// Convenience wrappers used by existing code
export async function signAdminCookie(): Promise<string> {
  return signSession({ role: "super" });
}

export async function verifyAdminCookie(value: string | undefined): Promise<boolean> {
  return (await verifySession(value)) !== null;
}
