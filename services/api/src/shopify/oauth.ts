import { createHmac, timingSafeEqual } from "node:crypto";

const SCOPES = ["read_products", "read_inventory", "read_locations"] as const;

interface BuildAuthUrlParams {
  shop: string;
  apiKey: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}

export function buildAuthUrl(params: BuildAuthUrlParams): string {
  const url = new URL(`https://${params.shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", params.apiKey);
  url.searchParams.set("scope", params.scopes.join(","));
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export function verifyCallbackHmac(
  params: Record<string, string | undefined>,
  apiSecret: string,
): boolean {
  const { hmac, ...rest } = params;
  if (!hmac) return false;

  const message = Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const expected = createHmac("sha256", apiSecret)
    .update(message)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    // timingSafeEqual throws if buffers differ in length
    return false;
  }
}

interface TokenResponse {
  access_token: string;
  scope: string;
}

export async function exchangeCode(
  shop: string,
  code: string,
  apiKey: string,
  apiSecret: string,
  redirectUri: string,
): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as TokenResponse;
  return data.access_token;
}

export { SCOPES };
