import { describe, it, expect } from "vitest";
import {
  parseReasonsInput,
  formatReasonsForEdit,
  parseExtraImagesInput,
  formatExtraImagesForEdit,
} from "../src/enrichment-utils.js";

describe("parseReasonsInput", () => {
  it("splits on newlines", () => {
    expect(parseReasonsInput("First\nSecond\nThird")).toEqual([
      "First",
      "Second",
      "Third",
    ]);
  });

  it("trims whitespace from each line", () => {
    expect(parseReasonsInput("  First  \n  Second  ")).toEqual([
      "First",
      "Second",
    ]);
  });

  it("filters out blank lines", () => {
    expect(parseReasonsInput("First\n\nSecond\n")).toEqual(["First", "Second"]);
  });

  it("returns empty array for blank input", () => {
    expect(parseReasonsInput("")).toEqual([]);
    expect(parseReasonsInput("   \n   ")).toEqual([]);
  });
});

describe("formatReasonsForEdit", () => {
  it("joins array with newlines", () => {
    expect(formatReasonsForEdit(["First", "Second"])).toBe("First\nSecond");
  });

  it("returns empty string for empty array", () => {
    expect(formatReasonsForEdit([])).toBe("");
  });
});

describe("parseExtraImagesInput", () => {
  it("splits on newlines and filters blanks", () => {
    expect(
      parseExtraImagesInput(
        "https://example.com/a.jpg\nhttps://example.com/b.jpg",
      ),
    ).toEqual(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
  });

  it("trims whitespace from URLs", () => {
    expect(parseExtraImagesInput("  https://example.com/a.jpg  ")).toEqual([
      "https://example.com/a.jpg",
    ]);
  });

  it("filters blank lines", () => {
    expect(
      parseExtraImagesInput("https://example.com/a.jpg\n\nhttps://example.com/b.jpg\n"),
    ).toEqual(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
  });

  it("returns empty array for blank input", () => {
    expect(parseExtraImagesInput("")).toEqual([]);
  });
});

describe("formatExtraImagesForEdit", () => {
  it("joins URLs with newlines", () => {
    expect(
      formatExtraImagesForEdit([
        "https://example.com/a.jpg",
        "https://example.com/b.jpg",
      ]),
    ).toBe("https://example.com/a.jpg\nhttps://example.com/b.jpg");
  });

  it("returns empty string for empty array", () => {
    expect(formatExtraImagesForEdit([])).toBe("");
  });
});
