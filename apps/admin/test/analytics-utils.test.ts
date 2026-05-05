import { describe, it, expect } from "vitest";
import {
  formatCount,
  pctOf,
  buildSparklinePath,
  fillDailyGaps,
} from "../src/analytics-utils.js";

describe("formatCount", () => {
  it("formats numbers below 1000 as-is", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });

  it("formats thousands with k suffix", () => {
    expect(formatCount(1000)).toBe("1.0k");
    expect(formatCount(1500)).toBe("1.5k");
    expect(formatCount(10000)).toBe("10.0k");
  });

  it("formats millions with M suffix", () => {
    expect(formatCount(1_000_000)).toBe("1.0M");
    expect(formatCount(2_500_000)).toBe("2.5M");
  });
});

describe("pctOf", () => {
  it("returns 0 when total is 0", () => {
    expect(pctOf(5, 0)).toBe(0);
  });

  it("calculates percentage rounded to one decimal", () => {
    expect(pctOf(1, 3)).toBe(33.3);
    expect(pctOf(2, 4)).toBe(50);
    expect(pctOf(1, 4)).toBe(25);
  });

  it("caps at 100", () => {
    expect(pctOf(5, 4)).toBe(100);
  });
});

describe("fillDailyGaps", () => {
  it("inserts zero-count days for gaps", () => {
    const input = [
      { date: "2024-01-01", tap_count: 3 },
      { date: "2024-01-03", tap_count: 7 },
    ];
    const result = fillDailyGaps(input, "2024-01-01", "2024-01-03");
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ date: "2024-01-02", tap_count: 0 });
  });

  it("returns empty array for empty input with same start/end", () => {
    const result = fillDailyGaps([], "2024-01-01", "2024-01-01");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: "2024-01-01", tap_count: 0 });
  });

  it("preserves existing counts", () => {
    const input = [{ date: "2024-06-15", tap_count: 12 }];
    const result = fillDailyGaps(input, "2024-06-15", "2024-06-15");
    expect(result[0]?.tap_count).toBe(12);
  });
});

describe("buildSparklinePath", () => {
  it("returns empty string for empty data", () => {
    expect(buildSparklinePath([], 200, 40)).toBe("");
  });

  it("returns a valid SVG path string starting with M", () => {
    const data = [
      { date: "2024-01-01", tap_count: 0 },
      { date: "2024-01-02", tap_count: 10 },
      { date: "2024-01-03", tap_count: 5 },
    ];
    const path = buildSparklinePath(data, 200, 40);
    expect(path).toMatch(/^M/);
    expect(path).toContain("L");
  });

  it("handles all-zero data without crashing", () => {
    const data = [
      { date: "2024-01-01", tap_count: 0 },
      { date: "2024-01-02", tap_count: 0 },
    ];
    expect(() => buildSparklinePath(data, 200, 40)).not.toThrow();
  });
});
