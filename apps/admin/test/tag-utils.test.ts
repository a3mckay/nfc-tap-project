import { describe, it, expect } from "vitest";
import {
  formatTagUuid,
  parseProvisionCount,
  tagStatusLabel,
  tagTapUrl,
} from "../src/tag-utils.js";

describe("formatTagUuid", () => {
  it("uppercases a uuid", () => {
    expect(formatTagUuid("abc12345-0000-0000-0000-000000000000")).toBe(
      "ABC12345-0000-0000-0000-000000000000",
    );
  });

  it("returns the string unchanged aside from case", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(formatTagUuid(uuid)).toBe(uuid.toUpperCase());
  });
});

describe("parseProvisionCount", () => {
  it("parses a valid integer string", () => {
    expect(parseProvisionCount("10")).toBe(10);
  });

  it("clamps below 1 to 1", () => {
    expect(parseProvisionCount("0")).toBe(1);
    expect(parseProvisionCount("-5")).toBe(1);
  });

  it("clamps above 100 to 100", () => {
    expect(parseProvisionCount("101")).toBe(100);
    expect(parseProvisionCount("9999")).toBe(100);
  });

  it("returns 1 for non-numeric input", () => {
    expect(parseProvisionCount("abc")).toBe(1);
    expect(parseProvisionCount("")).toBe(1);
  });

  it("floors decimal input", () => {
    expect(parseProvisionCount("7.9")).toBe(7);
  });
});

describe("tagStatusLabel", () => {
  it("returns a human-readable label for each status", () => {
    expect(tagStatusLabel("unassigned")).toBe("Unassigned");
    expect(tagStatusLabel("active")).toBe("Active");
    expect(tagStatusLabel("disabled")).toBe("Disabled");
    expect(tagStatusLabel("oos")).toBe("Out of stock");
  });
});

describe("tagTapUrl", () => {
  it("builds a tap page URL from a base and uuid", () => {
    expect(tagTapUrl("https://tap.example.com/p/", "abc-123")).toBe(
      "https://tap.example.com/p/abc-123",
    );
  });

  it("handles trailing slash on base", () => {
    expect(tagTapUrl("https://tap.example.com/p/", "uuid-1")).toContain(
      "/p/uuid-1",
    );
  });
});
