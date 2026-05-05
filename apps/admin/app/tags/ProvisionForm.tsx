"use client";

import { useState, useTransition } from "react";
import { provisionTagsAction } from "./actions.js";

interface Props {
  shop: string;
}

export function ProvisionForm({ shop }: Props) {
  const [count, setCount] = useState("10");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await provisionTagsAction(shop, count);
      if (result.error) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage(`Created ${result.created} tag${result.created !== 1 ? "s" : ""}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem" }}>
      <label style={{ fontSize: "0.85rem", color: "#555" }}>Provision</label>
      <input
        type="number"
        min={1}
        max={100}
        value={count}
        onChange={(e) => setCount(e.target.value)}
        style={{ width: "64px", padding: "0.4rem 0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.9rem" }}
      />
      <label style={{ fontSize: "0.85rem", color: "#555" }}>new tags</label>
      <button
        type="submit"
        disabled={isPending}
        style={{ padding: "0.4rem 0.9rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.6 : 1, fontSize: "0.85rem" }}
      >
        {isPending ? "Creating…" : "Create"}
      </button>
      {message && (
        <span style={{ fontSize: "0.85rem", color: message.startsWith("Error") ? "#c00" : "#166534" }}>
          {message}
        </span>
      )}
    </form>
  );
}
