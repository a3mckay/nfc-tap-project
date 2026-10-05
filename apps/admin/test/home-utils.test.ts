// PRD v4 §7 Step 15i: wording on the admin home page.
import { describe, it, expect } from "vitest";
import { weekChange, questionsHeadline } from "../src/home-utils.js";

describe("weekChange", () => {
  it("compares this week with last week", () => {
    expect(weekChange(30, 20)).toBe("+50% vs last week");
    expect(weekChange(10, 20)).toBe("−50% vs last week");
    expect(weekChange(20, 20)).toBe("Same as last week");
    expect(weekChange(5, 0)).toBe("New this week");
    expect(weekChange(0, 0)).toBeNull();
  });
});

describe("questionsHeadline (D44)", () => {
  it("summarizes the week's questions", () => {
    expect(questionsHeadline(38, "Sizing")).toBe("Customers asked 38 questions this week · top theme: Sizing");
    expect(questionsHeadline(1, null)).toBe("Customers asked 1 question this week");
    expect(questionsHeadline(0, null)).toBe("No customer questions this week yet");
  });
});
