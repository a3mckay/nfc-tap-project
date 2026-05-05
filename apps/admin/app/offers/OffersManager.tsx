"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StoreOffer } from "@nfc/db";
import { OfferForm } from "./OfferForm.js";

interface ProductOption { id: string; title: string }

interface Props {
  shop: string;
  offers: StoreOffer[];
  products: ProductOption[];
}

export function OffersManager({ shop, offers, products }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const productMap = new Map(products.map((p) => [p.id, p.title]));

  function refresh() {
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      {editingId === "new" ? (
        <OfferForm shop={shop} products={products} onSaved={refresh} />
      ) : (
        <button type="button" onClick={() => setEditingId("new")}
          style={{ padding: "0.5rem 1rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", marginBottom: "1.5rem" }}>
          + New offer
        </button>
      )}

      {offers.length === 0 && editingId !== "new" ? (
        <p style={{ color: "#888", fontSize: "0.9rem" }}>
          No offers yet. Create one above to reward customers when they tap.
        </p>
      ) : (
        offers.map((offer) => (
          editingId === offer.id ? (
            <OfferForm key={offer.id} shop={shop} offer={offer} products={products} onSaved={refresh} />
          ) : (
            <div key={offer.id} style={{ padding: "1rem 1.25rem", border: "1px solid #eee", borderRadius: "6px", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: offer.enabled ? 1 : 0.5 }}>
              <div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "2px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.9rem", fontWeight: 700, color: "#111", padding: "1px 6px", background: "#f5f5f5", borderRadius: "3px" }}>
                    {offer.code}
                  </span>
                  {!offer.enabled && <span style={{ fontSize: "0.7rem", color: "#888" }}>(disabled)</span>}
                </div>
                <p style={{ fontSize: "0.78rem", color: "#666" }}>
                  {offer.product_id ? productMap.get(offer.product_id) ?? "(deleted product)" : "All products"}
                  {" · "}
                  {triggerLabel(offer)}
                  {offer.expires_at && ` · expires ${new Date(offer.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <button type="button" onClick={() => setEditingId(offer.id)}
                style={{ padding: "0.35rem 0.875rem", background: "transparent", color: "#555", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.78rem", cursor: "pointer" }}>
                Edit
              </button>
            </div>
          )
        ))
      )}
    </div>
  );
}

function triggerLabel(o: StoreOffer): string {
  switch (o.trigger_kind) {
    case "always":         return "Always";
    case "after_reaction": return "After customer reacts";
    case "after_n_taps":   return `After ${o.trigger_n ?? 0} taps`;
  }
}
