import { describe, it, expect } from "vitest";
import { normalizeStaffEmail } from "../src/staff-utils.js";

describe("normalizeStaffEmail", () => {
  it("trims and lower-cases a valid email", () => {
    expect(normalizeStaffEmail("  Sam.Lee@Example.COM ")).toBe("sam.lee@example.com");
  });

  it("rejects empty input", () => {
    expect(normalizeStaffEmail("")).toBeNull();
    expect(normalizeStaffEmail("   ")).toBeNull();
  });

  it("rejects strings that aren't an email address", () => {
    expect(normalizeStaffEmail("sam")).toBeNull();
    expect(normalizeStaffEmail("sam@")).toBeNull();
    expect(normalizeStaffEmail("@example.com")).toBeNull();
    expect(normalizeStaffEmail("sam@example")).toBeNull();
    expect(normalizeStaffEmail("sam lee@example.com")).toBeNull();
  });
});
