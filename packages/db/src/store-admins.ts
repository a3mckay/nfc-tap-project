import type { Pool } from "pg";

export interface StoreAdmin {
  id: string;
  store_id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

// ── PBKDF2 password hashing (Web Crypto — works in Node + Edge) ───────────────

const ITERATIONS = 100_000;

function b64url(buf: ArrayBufferLike): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromb64url(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    256,
  );
  return `${b64url(salt.buffer)}:${b64url(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  const saltBytes = fromb64url(saltB64);
  const salt = saltBytes.buffer.slice(saltBytes.byteOffset, saltBytes.byteOffset + saltBytes.byteLength) as ArrayBuffer;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    256,
  );
  const candidate = b64url(bits);
  if (candidate.length !== hashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return diff === 0;
}

// ── DB functions ──────────────────────────────────────────────────────────────

export async function createStoreAdmin(
  pool: Pool,
  storeId: string,
  email: string,
  password: string,
): Promise<StoreAdmin> {
  const hash = await hashPassword(password);
  const { rows } = await pool.query<StoreAdmin>(
    `insert into store_admins (store_id, email, password_hash)
     values ($1, $2, $3)
     returning *`,
    [storeId, email.toLowerCase().trim(), hash],
  );
  if (!rows[0]) throw new Error("createStoreAdmin returned no row");
  return rows[0];
}

export async function getStoreAdminByEmail(
  pool: Pool,
  email: string,
): Promise<StoreAdmin | null> {
  const { rows } = await pool.query<StoreAdmin>(
    `select * from store_admins where email = $1`,
    [email.toLowerCase().trim()],
  );
  return rows[0] ?? null;
}
