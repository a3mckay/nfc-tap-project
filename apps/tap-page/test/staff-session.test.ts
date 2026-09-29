// PRD v4 §7 Step 13c: the tap page's own staff cookie.
import { describe, it, expect, beforeAll } from "vitest";
import {
  signStaffCookie, verifyStaffCookie, hashHandoffToken, safeReturnPath, STAFF_COOKIE_MAX_AGE_SECONDS,
} from "../src/lib/staff-session.js";

beforeAll(() => { process.env.COOKIE_SECRET = "test-secret"; });

const staff = { kind: "staff", staffId: "st-1", storeId: "store-1" } as const;
const owner = { kind: "owner", storeAdminId: "a-1", storeId: "store-1" } as const;

describe("staff cookie", () => {
  it("round-trips staff and owner principals", () => {
    expect(verifyStaffCookie(signStaffCookie(staff))).toEqual(staff);
    expect(verifyStaffCookie(signStaffCookie(owner))).toEqual(owner);
  });

  it("lasts 30 days", () => {
    const now = Date.UTC(2026, 8, 29);
    expect(STAFF_COOKIE_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(verifyStaffCookie(signStaffCookie(staff, now), now + 29 * 86_400_000)).toEqual(staff);
    expect(verifyStaffCookie(signStaffCookie(staff, now), now + 31 * 86_400_000)).toBeNull();
  });

  it("rejects a tampered cookie", () => {
    const [payload, sig] = signStaffCookie(staff).split(".");
    const forged = Buffer.from(JSON.stringify({ ...staff, storeId: "store-2", exp: Date.now() + 1e9 })).toString("base64url");
    expect(verifyStaffCookie(`${forged}.${sig}`)).toBeNull();
    expect(verifyStaffCookie(`${payload}.x${sig!.slice(1)}`)).toBeNull();
    expect(verifyStaffCookie(undefined)).toBeNull();
    expect(verifyStaffCookie("garbage")).toBeNull();
  });
});

describe("hashHandoffToken", () => {
  it("matches the admin's SHA-256 base64url hashing", () => {
    expect(hashHandoffToken("abc")).toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });
});

describe("safeReturnPath", () => {
  it("keeps admin paths and rejects anything that could leave the admin", () => {
    expect(safeReturnPath("/training")).toBe("/training");
    expect(safeReturnPath("/tags?shop=a.myshopify.com")).toBe("/tags?shop=a.myshopify.com");
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "evil", ""]) expect(safeReturnPath(bad)).toBe("/");
  });
});
