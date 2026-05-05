"use client";

import { useState, useTransition } from "react";
import { createStoreAction } from "./actions.js";

const PLATFORMS = [
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "squarespace", label: "Squarespace" },
  { value: "other", label: "Other / Manual" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #ddd",
  borderRadius: "4px", fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box",
};

export function CreateStoreForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createStoreAction(data);
      if (r.error) {
        setError(r.error);
      } else {
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: "0.45rem 1rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
      >
        + Add store
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "1.25rem", border: "1px solid #eee", borderRadius: "8px", background: "#fff", marginTop: "1rem" }}>
      <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "1rem" }}>New store</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Domain</label>
          <input name="domain" required placeholder="mystore.myshopify.com" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Platform</label>
          <select name="platform" style={inputStyle}>
            {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      {error && <p style={{ fontSize: "0.82rem", color: "#c00", marginBottom: "0.75rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" disabled={pending}
          style={{ padding: "0.45rem 1rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.82rem", fontWeight: 600, cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1 }}>
          {pending ? "Creating…" : "Create store"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null); }}
          style={{ padding: "0.45rem 0.875rem", background: "transparent", color: "#888", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.82rem", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
