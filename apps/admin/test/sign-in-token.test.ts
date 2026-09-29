import { describe, it, expect } from "vitest";
import { hashSignInToken, newSignInToken } from "../src/sign-in-token.js";

describe("sign-in tokens", () => {
  // The tap page hashes handoff tokens with node:crypto; both sides must agree.
  it("hashes to base64url SHA-256 without padding", async () => {
    expect(await hashSignInToken("abc")).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });

  it("makes a new random token each time, returned with its hash", async () => {
    const a = await newSignInToken();
    const b = await newSignInToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(await hashSignInToken(a.token));
  });
});
