"use client";

// The store's display name, shown to customers on tap pages, in the chat and
// when a product link is shared.
import { useState, useTransition } from "react";
import { setStoreNameAction } from "./actions.js";

export function StoreNameField({ shop, initial }: { shop: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await setStoreNameAction(shop, value);
          setStatus(res.error ?? "Saved");
        });
      }}
      style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
      <input value={value} onChange={(e) => { setValue(e.target.value); setStatus(null); }}
        aria-label="Store name" placeholder="e.g. Queen West Shoes" maxLength={60}
        style={{ flex: "1 1 240px", padding: "0.5rem 0.7rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.9rem", fontFamily: "inherit" }} />
      <button type="submit" disabled={isPending || value.trim() === initial.trim()}
        style={{ padding: "0.5rem 1.1rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending || value.trim() === initial.trim() ? 0.5 : 1 }}>
        {isPending ? "Saving…" : "Save"}
      </button>
      {status && <span style={{ fontSize: "0.82rem", color: status === "Saved" ? "#15803d" : "#c00" }}>{status}</span>}
    </form>
  );
}
