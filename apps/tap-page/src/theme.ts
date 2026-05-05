export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  logoUrl: string | null;
  layout: "minimal" | "content-rich";
}

export const DEFAULT_THEME: ThemeSettings = {
  primaryColor: "#000000",
  secondaryColor: "#666666",
  tertiaryColor: "#e5e5e5",
  backgroundColor: "#ffffff",
  fontFamily: "system-ui, sans-serif",
  logoUrl: null,
  layout: "minimal",
};

export function buildThemeVars(
  theme: Partial<ThemeSettings>,
): Record<string, string> {
  return {
    "--brand-primary":    theme.primaryColor    ?? DEFAULT_THEME.primaryColor,
    "--brand-secondary":  theme.secondaryColor  ?? DEFAULT_THEME.secondaryColor,
    "--brand-tertiary":   theme.tertiaryColor   ?? DEFAULT_THEME.tertiaryColor,
    "--brand-bg":         theme.backgroundColor ?? DEFAULT_THEME.backgroundColor,
    "--brand-font":       theme.fontFamily      ?? DEFAULT_THEME.fontFamily,
    backgroundColor:      theme.backgroundColor ?? DEFAULT_THEME.backgroundColor,
    fontFamily:           theme.fontFamily      ?? DEFAULT_THEME.fontFamily,
  };
}
