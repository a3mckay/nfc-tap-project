// Single-use tokens for emailed staff sign-in links (13b) and the tap-page
// handoff (13c). The token goes in the link; only its SHA-256 hash is stored.

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function hashSignInToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return b64url(new Uint8Array(digest));
}

export async function newSignInToken(): Promise<{ token: string; hash: string }> {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  return { token, hash: await hashSignInToken(token) };
}

export const STAFF_SIGN_IN_TTL_MINUTES = 15;
