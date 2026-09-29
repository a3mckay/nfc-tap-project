import { describe, it, expect } from "vitest";
import { reviewedLabel, lastActiveLabel } from "../src/progress-utils.js";

describe("reviewedLabel", () => {
  it("shows reviewed out of tagged products", () => {
    expect(reviewedLabel(12, 40)).toBe("12 of 40 products reviewed");
    expect(reviewedLabel(1, 1)).toBe("1 of 1 product reviewed");
    expect(reviewedLabel(0, 0)).toBe("No tagged products yet");
  });
});

describe("lastActiveLabel", () => {
  const now = new Date("2026-09-29T12:00:00Z");
  it("says when the staff member last opened a training view", () => {
    expect(lastActiveLabel(null, now)).toBe("hasn't tapped anything yet");
    expect(lastActiveLabel(new Date("2026-09-29T09:00:00Z"), now)).toBe("last active today");
    expect(lastActiveLabel(new Date("2026-09-28T09:00:00Z"), now)).toBe("last active yesterday");
    expect(lastActiveLabel(new Date("2026-09-19T12:00:00Z"), now)).toBe("last active 10 days ago");
  });
});
