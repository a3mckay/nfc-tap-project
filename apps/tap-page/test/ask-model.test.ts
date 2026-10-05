// PRD v4 §7 Step 15c/15d: which model answers, and how it's called. Sonnet 5.5
// is the default after Haiku 4.5 missed the quality bar (D16, D52).
import { describe, it, expect } from "vitest";
import { answerModel, requestOptions } from "@/ask/model.js";

describe("answerModel", () => {
  it("defaults to Claude Sonnet 5.5 and can be overridden with ASK_MODEL", () => {
    expect(answerModel({})).toBe("claude-sonnet-5-5");
    expect(answerModel({ ASK_MODEL: "claude-haiku-4-5" })).toBe("claude-haiku-4-5");
  });
});

describe("requestOptions", () => {
  it("keeps Haiku plain", () => {
    expect(requestOptions("claude-haiku-4-5")).toEqual({});
  });

  it("runs Sonnet 5.5 at low effort with thinking off, with the server-side refusal fallback", () => {
    expect(requestOptions("claude-sonnet-5-5")).toEqual({
      thinking: { type: "between_tools" },
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  });
});
