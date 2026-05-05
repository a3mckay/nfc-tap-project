"use client";

import { useState, useTransition } from "react";
import { generateEnrichmentAction } from "./[product_id]/actions.js";

export function BulkGenerateButton({
  shop,
  productIds,
}: {
  shop: string;
  productIds: string[];
}) {
  const [done, setDone] = useState(0);
  const [pending, startTransition] = useTransition();

  if (productIds.length === 0) return null;

  function handleBulk() {
    if (!confirm(`Generate AI copy for ${productIds.length} product${productIds.length !== 1 ? "s" : ""}? This may take a minute.`)) return;
    setDone(0);
    startTransition(async () => {
      for (const id of productIds) {
        await generateEnrichmentAction(shop, id);
        setDone((n) => n + 1);
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <button
        type="button"
        onClick={handleBulk}
        disabled={pending}
        style={{
          padding: "0.45rem 1rem",
          background: pending ? "#f3f4f6" : "#6366f1",
          color: pending ? "#9ca3af" : "#fff",
          border: "none",
          borderRadius: "4px",
          fontSize: "0.82rem",
          fontWeight: 600,
          cursor: pending ? "default" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {pending ? `Generating… (${done}/${productIds.length})` : `✨ Generate all (${productIds.length})`}
      </button>
      {!pending && done > 0 && (
        <span style={{ fontSize: "0.8rem", color: "#166534" }}>Done — refresh to see results</span>
      )}
    </div>
  );
}
