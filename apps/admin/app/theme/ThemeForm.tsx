"use client";

import { useState, useTransition } from "react";
import { saveThemeAction, type ThemeFormData } from "./actions.js";
import { BrandDetector } from "./BrandDetector.js";
import type { BrandSuggestion } from "./detect-brand-action.js";
import type { BrandPendingSuggestion } from "@nfc/db";

const FONT_OPTIONS = [
  { label: "System default", value: "system-ui, sans-serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Georgia (serif)", value: "Georgia, serif" },
  { label: "Helvetica Neue", value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Playfair Display (serif)", value: "'Playfair Display', Georgia, serif" },
];

interface Props {
  initial: ThemeFormData;
  tapPageUrl: string;
  pendingSuggestion?: BrandPendingSuggestion | null;
}

export function ThemeForm({ initial, tapPageUrl, pendingSuggestion: initialPending }: Props) {
  const [form, setForm] = useState<ThemeFormData>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pending, setPending] = useState(initialPending ?? null);

  function set<K extends keyof ThemeFormData>(key: K, value: ThemeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    if (key === "logoUrl") setLogoError(false);
  }

  function handleApplyBrand(suggestion: BrandSuggestion, detectedFromUrl?: string) {
    setForm((prev) => ({
      ...prev,
      primaryColor: suggestion.primary,
      secondaryColor: suggestion.secondary,
      tertiaryColor: suggestion.tertiary,
      backgroundColor: suggestion.background,
      fontFamily: suggestion.font,
      brandDetectUrl: detectedFromUrl ?? prev.brandDetectUrl,
    }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveThemeAction(form);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px", marginBottom: "1.25rem" };
  const labelStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em" };
  const inputStyle: React.CSSProperties = { padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.95rem" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
      {/* Form */}
      <form onSubmit={handleSubmit}>
        {pending && (
          <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "8px" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#92400e", marginBottom: "0.5rem" }}>
              Updated brand colours detected
            </p>
            <p style={{ fontSize: "0.78rem", color: "#78350f", marginBottom: "0.75rem" }}>
              We re-scanned your website on {new Date(pending.detected_at).toLocaleDateString()} and found updated colours. Apply them or dismiss.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => { handleApplyBrand(pending, form.brandDetectUrl); setPending(null); }}
                style={{ padding: "0.35rem 0.875rem", background: "#92400e", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                Apply updated colours
              </button>
              <button type="button" onClick={() => setPending(null)}
                style={{ padding: "0.35rem 0.875rem", background: "transparent", color: "#78350f", border: "1px solid #d97706", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer" }}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        <BrandDetector onApply={handleApplyBrand} />

        <div style={fieldStyle}>
          <label style={labelStyle}>Shop domain</label>
          <input style={{ ...inputStyle, color: "#999" }} value={form.shop} readOnly />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Primary colour</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)}
              style={{ width: "48px", height: "36px", border: "1px solid #ddd", borderRadius: "4px", padding: "2px", cursor: "pointer" }} />
            <input style={inputStyle} value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Secondary colour</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={form.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)}
              style={{ width: "48px", height: "36px", border: "1px solid #ddd", borderRadius: "4px", padding: "2px", cursor: "pointer" }} />
            <input style={inputStyle} value={form.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)} />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Tertiary colour</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={form.tertiaryColor} onChange={(e) => set("tertiaryColor", e.target.value)}
              style={{ width: "48px", height: "36px", border: "1px solid #ddd", borderRadius: "4px", padding: "2px", cursor: "pointer" }} />
            <input style={inputStyle} value={form.tertiaryColor} onChange={(e) => set("tertiaryColor", e.target.value)} />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Background colour</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={form.backgroundColor} onChange={(e) => set("backgroundColor", e.target.value)}
              style={{ width: "48px", height: "36px", border: "1px solid #ddd", borderRadius: "4px", padding: "2px", cursor: "pointer" }} />
            <input style={inputStyle} value={form.backgroundColor} onChange={(e) => set("backgroundColor", e.target.value)} />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Font</label>
          <select style={inputStyle} value={form.fontFamily} onChange={(e) => set("fontFamily", e.target.value)}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Logo URL</label>
          <input style={inputStyle} placeholder="https://…" value={form.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)} />
          <span style={{ fontSize: "0.75rem", color: "#888" }}>
            Must be a publicly accessible URL — social media CDNs (Instagram, Facebook) block external use. Upload to your Shopify Files or an image host instead.
          </span>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Layout</label>
          <select style={inputStyle} value={form.layout} onChange={(e) => set("layout", e.target.value as ThemeFormData["layout"])}>
            <option value="minimal">Minimal</option>
            <option value="content-rich">Content rich</option>
          </select>
        </div>

        {error && <p style={{ color: "#c00", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</p>}

        <button type="submit" disabled={isPending}
          style={{ padding: "0.6rem 1.25rem", background: form.primaryColor, color: "#fff", border: "none", borderRadius: "4px", fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.6 : 1 }}>
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save theme"}
        </button>
      </form>

      {/* Live preview */}
      <div style={{ position: "sticky", top: "1rem" }}>
        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Preview</p>

        {/* Phone shell */}
        <div style={{ border: "2px solid #222", borderRadius: "36px", overflow: "hidden", maxWidth: "260px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
          {/* Nav bar — always primary bg, always white text */}
          <div style={{ background: form.primaryColor, padding: "8px 16px", display: "flex", alignItems: "center" }}>
            {form.logoUrl && !logoError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="Logo" onError={() => setLogoError(true)}
                style={{ height: "14px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            ) : (
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", fontFamily: form.fontFamily, letterSpacing: "0.1em" }}>BRAND</span>
            )}
          </div>

          {/* Product body */}
          <div style={{ backgroundColor: form.backgroundColor, fontFamily: form.fontFamily }}>
            {/* Image placeholder — always neutral grey, never a brand color */}
            <div style={{ width: "100%", aspectRatio: "4/3", background: "#ebebeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#ccc", fontSize: "0.6rem" }}>Product image</span>
            </div>

            <div style={{ padding: "0.875rem" }}>
              {/* Vendor — neutral, always readable */}
              <p style={{ fontSize: "0.5rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3px" }}>Vendor name</p>
              {/* Title — primary color */}
              <p style={{ fontSize: "0.95rem", fontWeight: 700, color: form.primaryColor, lineHeight: 1.2, marginBottom: "3px" }}>Product Title</p>
              {/* Price — neutral, always readable */}
              <p style={{ fontSize: "0.78rem", color: "#555", marginBottom: "8px" }}>$149.00</p>

              {/* Accent tags using tertiary */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.5rem", padding: "2px 6px", background: form.tertiaryColor, color: form.primaryColor, borderRadius: "9999px", border: "1px solid rgba(0,0,0,0.06)" }}>Sustainable</span>
                <span style={{ fontSize: "0.5rem", padding: "2px 6px", background: form.tertiaryColor, color: form.primaryColor, borderRadius: "9999px", border: "1px solid rgba(0,0,0,0.06)" }}>New in</span>
              </div>

              {/* CTA — primary bg, white text */}
              <div style={{ background: form.primaryColor, color: "#fff", textAlign: "center", padding: "7px", borderRadius: "4px", fontSize: "0.62rem", fontWeight: 600, marginBottom: "10px" }}>
                Shop now
              </div>

              {/* Section label — primary color */}
              <p style={{ fontSize: "0.44rem", color: form.primaryColor, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "3px" }}>The story</p>
              <p style={{ fontSize: "0.58rem", color: "#555", lineHeight: 1.4 }}>Made with care, designed to last a lifetime.</p>
            </div>
          </div>
        </div>

        {/* Colour palette strip */}
        <div style={{ display: "flex", gap: "6px", marginTop: "12px", maxWidth: "260px" }}>
          {[
            { color: form.primaryColor, label: "Primary" },
            { color: form.secondaryColor, label: "Secondary" },
            { color: form.tertiaryColor, label: "Tertiary" },
            { color: form.backgroundColor, label: "Background" },
          ].map(({ color, label }) => (
            <div key={label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: "18px", background: color, borderRadius: "3px", border: "1px solid rgba(0,0,0,0.1)", marginBottom: "3px" }} />
              <span style={{ fontSize: "0.52rem", color: "#888" }}>{label}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "0.72rem", color: "#999", marginTop: "0.75rem" }}>
          Live tap page: <a href={tapPageUrl} target="_blank" rel="noreferrer" style={{ color: "#555" }}>{tapPageUrl}</a>
        </p>
      </div>
    </div>
  );
}
