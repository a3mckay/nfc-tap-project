import { describe, it, expect } from "vitest";
import { tierAllows, tierLabel, TIER_LIMITS } from "../src/tier-utils.js";

describe("tierAllows", () => {
  it("free tier allows ai_copy up to its limit", () => {
    expect(tierAllows("free", "ai_copy", 0)).toBe(true);
    expect(tierAllows("free", "ai_copy", TIER_LIMITS.free.ai_copy - 1)).toBe(true);
  });

  it("free tier blocks ai_copy when at limit", () => {
    expect(tierAllows("free", "ai_copy", TIER_LIMITS.free.ai_copy)).toBe(false);
  });

  it("pro tier allows more ai_copy than free", () => {
    expect(TIER_LIMITS.pro.ai_copy).toBeGreaterThan(TIER_LIMITS.free.ai_copy);
    expect(tierAllows("pro", "ai_copy", TIER_LIMITS.free.ai_copy)).toBe(true);
  });

  it("enterprise tier is unlimited (Infinity)", () => {
    expect(TIER_LIMITS.enterprise.ai_copy).toBe(Infinity);
    expect(tierAllows("enterprise", "ai_copy", 999999)).toBe(true);
  });

  it("free tier blocks analytics_retention beyond 7 days", () => {
    expect(tierAllows("free", "analytics_days", 7)).toBe(true);
    expect(tierAllows("free", "analytics_days", 8)).toBe(false);
  });
});

describe("tierLabel", () => {
  it("returns a display label for each tier", () => {
    expect(tierLabel("free")).toBe("Free");
    expect(tierLabel("starter")).toBe("Starter");
    expect(tierLabel("pro")).toBe("Pro");
    expect(tierLabel("enterprise")).toBe("Enterprise");
  });
});
