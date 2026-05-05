"use client";

import { useState, useTransition } from "react";
import { detectBrandAction, type BrandSuggestion } from "./detect-brand-action.js";

interface Props {
  onApply: (s: BrandSuggestion, url: string) => void;
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "50%",
        background: color, border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }} />
      <span style={{ fontSize: "0.65rem", color: "#888", fontFamily: "monospace" }}>{color}</span>
      <span style={{ fontSize: "0.7rem", color: "#555" }}>{label}</span>
    </div>
  );
}

export function BrandDetector({ onApply }: Props) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<BrandSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDetect() {
    if (!url.trim()) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const { result: r, error: e } = await detectBrandAction(url.trim());
      if (e) setError(e);
      else if (r) setResult(r);
    });
  }

  return (
    <div style={{ marginBottom: "2rem", padding: "1.25rem", background: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
      <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
        Detect from website
      </p>
      <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.875rem", lineHeight: 1.5 }}>
        Enter your store URL and we'll screenshot it, then suggest your brand colours and font automatically.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem" }}>
        <input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setResult(null); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleDetect()}
          placeholder="https://your-store.com"
          disabled={isPending}
          style={{
            flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #ddd",
            borderRadius: "4px", fontSize: "0.9rem", fontFamily: "inherit",
            background: "#fff",
          }}
        />
        <button
          type="button"
          onClick={handleDetect}
          disabled={isPending || !url.trim()}
          style={{
            padding: "0.5rem 1rem", background: "#111", color: "#fff",
            border: "none", borderRadius: "4px", fontSize: "0.85rem",
            fontWeight: 600, cursor: isPending ? "default" : "pointer",
            opacity: isPending || !url.trim() ? 0.5 : 1, whiteSpace: "nowrap",
          }}
        >
          {isPending ? "Detecting…" : "Detect"}
        </button>
      </div>

      {isPending && (
        <p style={{ fontSize: "0.78rem", color: "#888" }}>
          Taking a screenshot of your site — this usually takes 10–15 seconds…
        </p>
      )}

      {error && (
        <p style={{ fontSize: "0.78rem", color: "#c00" }}>{error}</p>
      )}

      {result && (
        <div>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "0.875rem" }}>
            <Swatch color={result.primary} label="Primary" />
            <Swatch color={result.secondary} label="Secondary" />
            <Swatch color={result.tertiary} label="Tertiary" />
            <Swatch color={result.background} label="Background" />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center" }}>
              <span style={{ fontSize: "0.7rem", color: "#555" }}>Font</span>
              <span style={{ fontSize: "0.8rem", fontFamily: result.font, fontWeight: 500 }}>
                {result.font.split(",")[0]?.replace(/'/g, "")}
              </span>
            </div>
          </div>
          {result.description && (
            <p style={{ fontSize: "0.78rem", color: "#666", marginBottom: "0.875rem", fontStyle: "italic" }}>
              {result.description}
            </p>
          )}
          <button
            type="button"
            onClick={() => onApply(result, url.trim())}
            style={{
              padding: "0.4rem 1rem", background: "#fff", color: "#111",
              border: "1px solid #111", borderRadius: "4px", fontSize: "0.82rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Apply to theme
          </button>
        </div>
      )}
    </div>
  );
}
