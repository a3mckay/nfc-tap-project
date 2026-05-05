"use client";

import { useState, useTransition } from "react";
import { syncProductsAction, type SyncResult } from "./actions.js";

export function SyncButton({ shop }: { shop: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      const r = await syncProductsAction(shop);
      setResult(r);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        style={{
          padding: "0.45rem 1rem", background: isPending ? "#f0f0f0" : "#fff",
          color: "#111", border: "1px solid #ddd", borderRadius: "4px",
          fontSize: "0.82rem", fontWeight: 600, cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "Syncing…" : "Sync with Shopify"}
      </button>

      {result && !result.error && (
        <span style={{ fontSize: "0.78rem", color: "#555" }}>
          {result.added > 0 && `+${result.added} added `}
          {result.updated > 0 && `${result.updated} updated `}
          {result.archived > 0 && `${result.archived} archived`}
          {result.added === 0 && result.updated === 0 && result.archived === 0 && "Already up to date"}
        </span>
      )}
      {result?.error && (
        <span style={{ fontSize: "0.78rem", color: "#c00" }}>{result.error}</span>
      )}
    </div>
  );
}
