// Edge-safe admin session cookie — signed with HMAC-SHA256 via Web Crypto.
// Cookie format: base64url(payload).base64url(signature)

const COOKIE_NAME = "nfc_admin";
const PAYLOAD = "authenticated";

function secret(): string {
  return process.env.ADMIN_COOKIE_SECRET ?? "dev-admin-secret-change-in-prod";
}

async function hmac(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function signAdminCookie(): Promise<string> {
  const sig = await hmac(PAYLOAD, secret());
  return `${PAYLOAD}.${sig}`;
}

export async function verifyAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (payload !== PAYLOAD || !sig) return false;
  const expected = await hmac(PAYLOAD, secret());
  if (sig.length !== expected.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export { COOKIE_NAME };
