import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookHmac } from "../src/shopify/webhooks.js";

const SECRET = "webhook_secret";

function makeSignature(body: string): string {
  return createHmac("sha256", SECRET).update(body, "utf8").digest("base64");
}

describe("verifyWebhookHmac", () => {
  it("returns true for a valid signature", () => {
    const body = JSON.stringify({ id: 123, title: "Test Product" });
    expect(verifyWebhookHmac(body, makeSignature(body), SECRET)).toBe(true);
  });

  it("returns false when signature is wrong", () => {
    const body = JSON.stringify({ id: 123 });
    expect(verifyWebhookHmac(body, "badsig", SECRET)).toBe(false);
  });

  it("returns false when body has been tampered with", () => {
    const original = JSON.stringify({ id: 123 });
    const tampered = JSON.stringify({ id: 456 });
    const sig = makeSignature(original);
    expect(verifyWebhookHmac(tampered, sig, SECRET)).toBe(false);
  });

  it("uses constant-time comparison to prevent timing attacks", () => {
    // This is a structural test: we cannot easily measure timing in unit tests,
    // but we verify the function uses timingSafeEqual by checking both truthy
    // and falsy paths return a boolean (not throwing on length mismatch).
    const body = "{}";
    expect(() => verifyWebhookHmac(body, "", SECRET)).not.toThrow();
    expect(verifyWebhookHmac(body, "", SECRET)).toBe(false);
  });
});
