"use client";

import { useState, useTransition } from "react";
import type { StoreOffer, OfferTrigger } from "@nfc/db";
import { saveOfferAction, deleteOfferAction } from "./actions.js";

interface ProductOption { id: string; title: string }

interface Props {
  shop: string;
  offer?: StoreOffer;
  products: ProductOption[];
  onSaved: () => void;
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px", marginBottom: "1rem" };
const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { padding: "0.5rem 0.75rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.9rem", fontFamily: "inherit" };

export function OfferForm({ shop, offer, products, onSaved }: Props) {
  const [code, setCode]               = useState(offer?.code ?? "");
  const [message, setMessage]         = useState(offer?.message ?? "You found our exclusive offer.");
  const [productId, setProductId]     = useState<string | "">(offer?.product_id ?? "");
  const [triggerKind, setTriggerKind] = useState<OfferTrigger>(offer?.trigger_kind ?? "always");
  const [triggerN, setTriggerN]       = useState<number>(offer?.trigger_n ?? 3);
  const [enabled, setEnabled]         = useState(offer?.enabled ?? true);
  const [expiresAt, setExpiresAt]     = useState(offer?.expires_at ? new Date(offer.expires_at).toISOString().slice(0, 10) : "");
  const [error, setError]             = useState<string | null>(null);
  const [pending, startTransition]    = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await saveOfferAction({
        shop, id: offer?.id, product_id: productId || null,
        code, message, trigger_kind: triggerKind, trigger_n: triggerKind === "after_n_taps" ? triggerN : null,
        enabled, expires_at: expiresAt || null,
      });
      if (r.error) setError(r.error);
      else onSaved();
    });
  }

  function handleDelete() {
    if (!offer) return;
    if (!confirm("Delete this offer?")) return;
    startTransition(async () => {
      await deleteOfferAction(shop, offer.id);
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "1.25rem", border: "1px solid #eee", borderRadius: "8px", background: "#fff", marginBottom: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Discount code</label>
          <input style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }}
            value={code} onChange={(e) => setCode(e.target.value)} placeholder="ALLY15" required />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Applies to</label>
          <select style={inputStyle} value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products (store-wide)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Message shown to customer</label>
        <input style={inputStyle} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="You found our exclusive offer." />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Trigger</label>
          <select style={inputStyle} value={triggerKind} onChange={(e) => setTriggerKind(e.target.value as OfferTrigger)}>
            <option value="always">Always (on first tap)</option>
            <option value="after_reaction">After customer reacts</option>
            <option value="after_n_taps">After N total taps</option>
          </select>
        </div>
        {triggerKind === "after_n_taps" && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Tap threshold</label>
            <input type="number" min={2} style={inputStyle} value={triggerN} onChange={(e) => setTriggerN(parseInt(e.target.value, 10) || 2)} />
          </div>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>Expires (optional)</label>
          <input type="date" style={inputStyle} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#444" }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {offer && (
            <button type="button" onClick={handleDelete} disabled={pending}
              style={{ padding: "0.45rem 0.875rem", background: "transparent", color: "#c00", border: "1px solid #fcc", borderRadius: "4px", fontSize: "0.82rem", cursor: pending ? "default" : "pointer" }}>
              Delete
            </button>
          )}
          <button type="submit" disabled={pending}
            style={{ padding: "0.45rem 1rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600, cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1 }}>
            {pending ? "Saving…" : offer ? "Save" : "Create offer"}
          </button>
        </div>
      </div>

      {error && <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "#c00" }}>{error}</p>}
    </form>
  );
}
