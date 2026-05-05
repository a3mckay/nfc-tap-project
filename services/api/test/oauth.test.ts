import { describe, expect, it } from "vitest";
import { buildAuthUrl, verifyCallbackHmac } from "../src/shopify/oauth.js";

describe("buildAuthUrl", () => {
  const params = {
    shop: "my-test-store.myshopify.com",
    apiKey: "test_api_key",
    redirectUri: "https://myapp.example.com/auth/callback",
    scopes: ["read_products", "read_inventory", "read_locations"],
    state: "random_nonce_abc123",
  };

  it("returns a URL pointing at the correct Shopify shop", () => {
    const url = new URL(buildAuthUrl(params));
    expect(url.hostname).toBe("my-test-store.myshopify.com");
    expect(url.pathname).toBe("/admin/oauth/authorize");
  });

  it("includes client_id, redirect_uri, scope, state query params", () => {
    const url = new URL(buildAuthUrl(params));
    expect(url.searchParams.get("client_id")).toBe("test_api_key");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://myapp.example.com/auth/callback",
    );
    expect(url.searchParams.get("scope")).toBe(
      "read_products,read_inventory,read_locations",
    );
    expect(url.searchParams.get("state")).toBe("random_nonce_abc123");
  });
});

describe("verifyCallbackHmac", () => {
  const apiSecret = "test_secret";

  it("returns true when HMAC is valid", () => {
    // Construct a valid HMAC the same way Shopify does:
    // sort params (excluding hmac), join as key=value&…, HMAC-SHA256 with secret, hex-encode.
    const { createHmac } = require("node:crypto");
    const params = { shop: "store.myshopify.com", code: "abc", state: "nonce" };
    const message = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const hmac = createHmac("sha256", apiSecret).update(message).digest("hex");

    expect(verifyCallbackHmac({ ...params, hmac }, apiSecret)).toBe(true);
  });

  it("returns false when HMAC is invalid", () => {
    const params = {
      shop: "store.myshopify.com",
      code: "abc",
      state: "nonce",
      hmac: "badsignature",
    };
    expect(verifyCallbackHmac(params, apiSecret)).toBe(false);
  });

  it("returns false when hmac param is missing", () => {
    expect(
      verifyCallbackHmac({ shop: "store.myshopify.com" }, apiSecret),
    ).toBe(false);
  });
});
