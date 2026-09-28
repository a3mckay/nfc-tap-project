import { describe, it, expect } from "vitest";
import { normalizePhone } from "../src/phone-utils.js";

describe("normalizePhone", () => {
  it("returns null for empty input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
  });

  it("keeps an explicit international number", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("treats a bare 10-digit number as North American (+1)", () => {
    expect(normalizePhone("416-555-1234")).toBe("+14165551234");
    expect(normalizePhone("(416) 555 1234")).toBe("+14165551234");
  });

  it("accepts an 11-digit number with a leading 1 and no +", () => {
    expect(normalizePhone("1 416 555 1234")).toBe("+14165551234");
  });

  it("rejects numbers that are too short or too long", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+1234567890123456")).toBeNull();
  });

  it("rejects a country code starting with 0", () => {
    expect(normalizePhone("+0123456789")).toBeNull();
  });
});
