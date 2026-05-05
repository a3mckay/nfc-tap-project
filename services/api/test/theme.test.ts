import { describe, expect, it } from "vitest";
import { parseThemeSettings, DEFAULT_THEME } from "../src/shopify/theme.js";

// Dawn theme format (Shopify's most-used free theme)
const dawnSettings = {
  current: {
    colors_accent_1: "#5C6AC4",
    colors_background_1: "#FFFFFF",
    type_body_font: "assistant_n4",
  },
};

// Debut theme format (older common theme)
const debutSettings = {
  current: {
    color_primary: "#304234",
    color_bg: "#f8f7f4",
    type_body_font: "work_sans_n4",
  },
};

// Unknown theme with no recognised keys
const unknownSettings = {
  current: {
    some_other_key: "#aabbcc",
  },
};

describe("parseThemeSettings", () => {
  it("extracts primary colour from Dawn-style settings (colors_accent_1)", () => {
    const result = parseThemeSettings(dawnSettings, null);
    expect(result.primaryColor).toBe("#5C6AC4");
  });

  it("extracts background colour from Dawn-style settings (colors_background_1)", () => {
    const result = parseThemeSettings(dawnSettings, null);
    expect(result.backgroundColor).toBe("#FFFFFF");
  });

  it("extracts primary colour from Debut-style settings (color_primary)", () => {
    const result = parseThemeSettings(debutSettings, null);
    expect(result.primaryColor).toBe("#304234");
  });

  it("extracts background colour from Debut-style settings (color_bg)", () => {
    const result = parseThemeSettings(debutSettings, null);
    expect(result.backgroundColor).toBe("#f8f7f4");
  });

  it("maps a Shopify font handle to a usable CSS font-family string", () => {
    const result = parseThemeSettings(dawnSettings, null);
    // assistant_n4 → Assistant (strip variant suffix _n4, capitalise)
    expect(result.fontFamily).toMatch(/Assistant/i);
  });

  it("falls back to DEFAULT_THEME values when settings are unrecognised", () => {
    const result = parseThemeSettings(unknownSettings, null);
    expect(result.primaryColor).toBe(DEFAULT_THEME.primaryColor);
    expect(result.backgroundColor).toBe(DEFAULT_THEME.backgroundColor);
    expect(result.fontFamily).toBe(DEFAULT_THEME.fontFamily);
  });

  it("sets logoUrl from the provided shop icon URL", () => {
    const result = parseThemeSettings(unknownSettings, "https://cdn.shopify.com/logo.png");
    expect(result.logoUrl).toBe("https://cdn.shopify.com/logo.png");
  });

  it("sets logoUrl to null when no icon is provided", () => {
    const result = parseThemeSettings(dawnSettings, null);
    expect(result.logoUrl).toBeNull();
  });

  it("defaults layout to minimal", () => {
    const result = parseThemeSettings(dawnSettings, null);
    expect(result.layout).toBe("minimal");
  });
});
