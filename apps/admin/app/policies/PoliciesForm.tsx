"use client";

import { useState, useTransition } from "react";
import { saveStorePoliciesAction } from "./actions.js";

interface Props {
  shop: string;
  types: ReadonlyArray<{ key: string; label: string; hint: string }>;
  initial: Record<string, string>;
}

const labelStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em" };
const hintStyle: React.CSSProperties = { fontSize: "0.78rem", color: "#888", margin: "2px 0 6px" };
const taStyle: React.CSSProperties = { width: "100%", minHeight: "64px", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.92rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" };

export function PoliciesForm({ shop, types, initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveStorePoliciesAction(shop, values);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={save}>
      {types.map((t) => (
        <div key={t.key} style={{ marginBottom: "1.25rem" }}>
          <label htmlFor={`policy-${t.key}`} style={labelStyle}>{t.label}</label>
          <p style={hintStyle}>{t.hint}</p>
          <textarea id={`policy-${t.key}`} style={taStyle} value={values[t.key] ?? ""} maxLength={1200}
            placeholder="Leave blank if it doesn't apply"
            onChange={(e) => { setValues({ ...values, [t.key]: e.target.value }); setSaved(false); }} />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button type="submit" disabled={isPending}
          style={{ padding: "0.55rem 1.1rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}>
          {isPending ? "Saving…" : "Save policies"}
        </button>
        {saved && <span style={{ fontSize: "0.82rem", color: "#15803d" }}>Saved</span>}
        {error && <span role="alert" style={{ fontSize: "0.82rem", color: "#c00" }}>{error}</span>}
      </div>
    </form>
  );
}
