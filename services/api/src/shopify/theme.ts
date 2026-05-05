export interface ThemeSettings {
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  logoUrl: string | null;
  layout: "minimal" | "content-rich";
}

export const DEFAULT_THEME: ThemeSettings = {
  primaryColor: "#000000",
  backgroundColor: "#ffffff",
  fontFamily: "system-ui, sans-serif",
  logoUrl: null,
  layout: "minimal",
};

// Priority-ordered lists of known Shopify theme setting keys.
const PRIMARY_COLOR_KEYS = [
  "colors_accent_1",    // Dawn, Sense, Refresh
  "color_primary",      // Debut, Brooklyn
  "color_button",       // Minimal, Simple
  "color_accent",       // various
];

const BG_COLOR_KEYS = [
  "colors_background_1",  // Dawn, Sense, Refresh
  "color_bg",              // Debut
  "color_body_bg",         // Brooklyn, Minimal
  "colors_background",     // various
];

const FONT_KEYS = ["type_body_font", "type_base_font", "font_body"];

// Shopify font handles look like "assistant_n4" or "work_sans_n4".
// Convert to a CSS font-family by stripping the variant suffix and capitalising words.
function shopifyFontToFamily(handle: string): string {
  const base = handle.replace(/_n\d+$/, "").replace(/_/g, " ");
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickFirst(settings: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const val = settings[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

export function parseThemeSettings(
  settingsData: { current?: Record<string, unknown> },
  shopIconUrl: string | null,
): ThemeSettings {
  const current = settingsData.current ?? {};

  const primaryColor = pickFirst(current, PRIMARY_COLOR_KEYS) ?? DEFAULT_THEME.primaryColor;
  const backgroundColor = pickFirst(current, BG_COLOR_KEYS) ?? DEFAULT_THEME.backgroundColor;

  const fontHandle = pickFirst(current, FONT_KEYS);
  const fontFamily = fontHandle
    ? `${shopifyFontToFamily(fontHandle)}, system-ui, sans-serif`
    : DEFAULT_THEME.fontFamily;

  return {
    primaryColor,
    backgroundColor,
    fontFamily,
    logoUrl: shopIconUrl,
    layout: "minimal",
  };
}

// ---

interface ShopResponse {
  shop: { icon?: { src: string } | null };
}

interface ThemeListResponse {
  themes: Array<{ id: number; role: string }>;
}

interface AssetResponse {
  asset: { value: string };
}

export async function fetchThemeSettings(
  shop: string,
  accessToken: string,
): Promise<ThemeSettings> {
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };
  const base = `https://${shop}/admin/api/2024-10`;

  // Fetch shop icon for logo
  const shopRes = await fetch(`${base}/shop.json?fields=icon`, { headers });
  const shopData = shopRes.ok ? ((await shopRes.json()) as ShopResponse) : null;
  const iconUrl = shopData?.shop?.icon?.src ?? null;

  // Find the published theme
  const themesRes = await fetch(`${base}/themes.json?fields=id,role`, { headers });
  if (!themesRes.ok) return { ...DEFAULT_THEME, logoUrl: iconUrl };

  const themesData = (await themesRes.json()) as ThemeListResponse;
  const published = themesData.themes.find((t) => t.role === "main");
  if (!published) return { ...DEFAULT_THEME, logoUrl: iconUrl };

  // Fetch theme settings_data.json
  const assetRes = await fetch(
    `${base}/themes/${published.id}/assets.json?asset[key]=config/settings_data.json`,
    { headers },
  );
  if (!assetRes.ok) return { ...DEFAULT_THEME, logoUrl: iconUrl };

  const assetData = (await assetRes.json()) as AssetResponse;
  let settingsData: { current?: Record<string, unknown> } = {};
  try {
    settingsData = JSON.parse(assetData.asset.value) as typeof settingsData;
  } catch {
    return { ...DEFAULT_THEME, logoUrl: iconUrl };
  }

  return parseThemeSettings(settingsData, iconUrl);
}
