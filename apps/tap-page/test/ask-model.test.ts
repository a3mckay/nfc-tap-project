// PRD v4 §7 Step 15c/15d: which model answers, and how it's called.
import { describe, it, expect } from "vitest";
import { answerModel, requestOptions } from "@/ask/model.js";

describe("answerModel", () => {
  it("defaults to Claude Haiku 4.5 and can be overridden with ASK_MODEL", () => {
    expect(answerModel({})).toBe("claude-haiku-4-5");
    expect(answerModel({ ASK_MODEL: "claude-sonnet-5-5" })).toBe("claude-sonnet-5-5");
  });
});

describe("requestOptions", () => {
  it("keeps Haiku plain", () => {
    expect(requestOptions("claude-haiku-4-5")).toEqual({});
  });

  it("runs Sonnet 5.5 at low effort with thinking off between tools, for a fast first word", () => {
    expect(requestOptions("claude-sonnet-5-5")).toEqual({ thinking: { type: "between_tools" }, output_config: { effort: "low" } });
  });
});
