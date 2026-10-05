"use client";

// PRD v4 §7 Step 15l: the product's spec fields (D51). The category is detected
// from the product's type and title (or the store's industry); owners and
// managers can pick another. Generate fills empty fields from sources; values
// typed here always win.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSpecsAction } from "./specActions.js";

interface Field { key: string; label: string; hint: string }
interface Spec { key: string; value: string; source_url: string | null; source_kind: string }

interface Props {
  shop: string;
  productId: string;
  detected: string;
  override: string | null;
  templates: Record<string, Field[]>;
  specs: Spec[];
}

const LABEL: Record<string, string> = {
  cannabis: "Cannabis", wine: "Wine", beer: "Beer", spirits: "Spirits", eyewear: "Eyewear",
  footwear: "Footwear", apparel: "Apparel", home: "Home", general: "General",
};
const KIND: Record<string, string> = { brand: "Brand site", retailer: "Retailer", review: "Review", other: "Web", owner: "Your entry" };
const inputStyle: React.CSSProperties = { padding: "0.4rem 0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.88rem", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function SpecsPanel({ shop, productId, detected, override, templates, specs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [choice, setChoice] = useState<string>(override ?? "");
  const category = choice || detected;
  const byKey = new Map(specs.map((s) => [s.key, s]));
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(specs.map((s) => [s.key, s.value])));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fields = templates[category] ?? [];

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveSpecsAction(shop, productId, choice || null, Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? ""])));
      if (res.error) { setError(res.error); return; }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section style={{ borderTop: "1px solid #eee", paddingTop: "1.5rem", marginTop: "2rem" }} aria-labelledby="specs-heading">
      <p id="specs-heading" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35rem" }}>Product specs</p>
      <p style={{ fontSize: "0.78rem", color: "#888", margin: "0 0 1rem" }}>
        Facts customers ask about for this kind of product. The AI assistant answers from them. Generate fills empty ones from the web; what you type here always wins.
      </p>
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem", color: "#444", marginBottom: "1rem" }}>
        Category
        <select value={choice} onChange={(e) => { setChoice(e.target.value); setSaved(false); }} style={{ ...inputStyle, width: "auto" }}>
          <option value="">Automatic ({LABEL[detected] ?? detected})</option>
          {Object.keys(templates).map((c) => <option key={c} value={c}>{LABEL[c] ?? c}</option>)}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.85rem" }}>
        {fields.map((f) => {
          const s = byKey.get(f.key);
          return (
            <div key={f.key}>
              <label htmlFor={`spec-${f.key}`} style={{ fontSize: "0.78rem", fontWeight: 600, color: "#444" }}>{f.label}</label>
              <input id={`spec-${f.key}`} style={{ ...inputStyle, marginTop: "3px" }} placeholder={f.hint} value={values[f.key] ?? ""}
                onChange={(e) => { setValues({ ...values, [f.key]: e.target.value }); setSaved(false); }} />
              {s && values[f.key] === s.value && (
                <p style={{ fontSize: "0.7rem", color: "#999", margin: "2px 0 0" }}>
                  {KIND[s.source_kind] ?? s.source_kind}{s.source_url && <> · <a href={s.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "#999" }}>{hostOf(s.source_url)}</a></>}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
        <button type="button" onClick={save} disabled={isPending}
          style={{ padding: "0.5rem 1rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
          {isPending ? "Saving…" : "Save specs"}
        </button>
        {saved && <span style={{ fontSize: "0.82rem", color: "#15803d" }}>Saved</span>}
        {error && <span role="alert" style={{ fontSize: "0.82rem", color: "#c00" }}>{error}</span>}
      </div>
    </section>
  );
}
