"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addManualProductAction } from "../actions.js";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #ddd",
  borderRadius: "4px", fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#444",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px",
};

export function AddProductForm({ shop }: { shop: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [productType, setProductType] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addManualProductAction(shop, title, vendor, productType);
      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/enrichment/${result.productId}?shop=${shop}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "480px" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Product title *</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Merino Wool Crewneck" required />
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Vendor / Brand</label>
        <input style={inputStyle} value={vendor} onChange={(e) => setVendor(e.target.value)}
          placeholder="e.g. Ally Capellino" />
      </div>

      <div style={{ marginBottom: "1.75rem" }}>
        <label style={labelStyle}>Product type</label>
        <input style={inputStyle} value={productType} onChange={(e) => setProductType(e.target.value)}
          placeholder="e.g. Knitwear" />
      </div>

      <div style={{ padding: "0.75rem 1rem", background: "#f9f9f9", border: "1px solid #eee", borderRadius: "6px", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.78rem", color: "#666", lineHeight: 1.5 }}>
          Manually added products are never overwritten by Shopify sync. After saving, you&apos;ll be taken straight to the Edit Details page.
        </p>
      </div>

      {error && <p style={{ color: "#c00", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" disabled={isPending || !title.trim()}
          style={{
            padding: "0.55rem 1.25rem", background: "#111", color: "#fff",
            border: "none", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600,
            cursor: isPending || !title.trim() ? "default" : "pointer",
            opacity: isPending || !title.trim() ? 0.5 : 1,
          }}>
          {isPending ? "Saving…" : "Add product"}
        </button>
        <button type="button" onClick={() => router.push(`/products?shop=${shop}`)}
          style={{
            padding: "0.55rem 1rem", background: "transparent", color: "#555",
            border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.85rem", cursor: "pointer",
          }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
