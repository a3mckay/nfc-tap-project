import { getPool, getStoreByDomain } from "@nfc/db";
import type { BrandPendingSuggestion } from "@nfc/db";
import { ThemeForm } from "./ThemeForm.js";
import type { ThemeFormData } from "./actions.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

const DEFAULT_FORM: ThemeFormData = {
  shop: "",
  primaryColor: "#000000",
  secondaryColor: "#666666",
  tertiaryColor: "#e5e5e5",
  backgroundColor: "#ffffff",
  fontFamily: "system-ui, sans-serif",
  logoUrl: "",
  layout: "minimal",
};

export default async function ThemePage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Theme Settings</h1>
        <p style={{ color: "#666" }}>
          Pass <code>?shop=your-store.myshopify.com</code> to edit a store&apos;s theme.
        </p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  const theme = store?.theme_settings as Partial<ThemeFormData> | null;
  const initial: ThemeFormData = {
    shop,
    primaryColor: theme?.primaryColor ?? DEFAULT_FORM.primaryColor,
    secondaryColor: theme?.secondaryColor ?? DEFAULT_FORM.secondaryColor,
    tertiaryColor: theme?.tertiaryColor ?? DEFAULT_FORM.tertiaryColor,
    backgroundColor: theme?.backgroundColor ?? DEFAULT_FORM.backgroundColor,
    fontFamily: theme?.fontFamily ?? DEFAULT_FORM.fontFamily,
    logoUrl: theme?.logoUrl ?? "",
    layout: theme?.layout ?? DEFAULT_FORM.layout,
    brandDetectUrl: (store as unknown as { brand_detect_url?: string })?.brand_detect_url ?? undefined,
  };

  const pendingSuggestion = (store as unknown as { brand_pending_suggestion?: BrandPendingSuggestion })?.brand_pending_suggestion ?? null;

  const tapPageUrl = `${process.env.TAP_PAGE_CDN_URL ?? "http://localhost:3001"}/p/`;

  return (
    <main>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Theme Settings</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        {store ? `Editing ${shop}` : <span style={{ color: "#c00" }}>Store not found — connect it via Shopify OAuth first.</span>}
      </p>
      <ThemeForm initial={initial} tapPageUrl={tapPageUrl} pendingSuggestion={pendingSuggestion} />
    </main>
  );
}
