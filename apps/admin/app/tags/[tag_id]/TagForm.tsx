"use client";

import { useState, useTransition } from "react";
import { assignTagAction, setTagStatusAction } from "./actions.js";
import type { TagStatus } from "@nfc/db";

interface ProductOption {
  id: string;
  title: string;
}

interface Props {
  shop: string;
  tagId: string;
  currentProductId: string | null;
  currentStatus: TagStatus;
  products: ProductOption[];
}

const ALL_STATUSES: { value: TagStatus; label: string }[] = [
  { value: "unassigned", label: "Unassigned" },
  { value: "active",     label: "Active" },
  { value: "disabled",   label: "Disabled" },
  { value: "oos",        label: "Out of stock" },
];

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  border: "1px solid #ddd",
  borderRadius: "4px",
  fontSize: "0.95rem",
  width: "100%",
};
const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: "1.25rem",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#444",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export function TagForm({ shop, tagId, currentProductId, currentStatus, products }: Props) {
  const [productId, setProductId] = useState(currentProductId ?? "");
  const [status, setStatus] = useState<TagStatus>(currentStatus);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const [assignResult, statusResult] = await Promise.all([
        assignTagAction(shop, tagId, productId || null),
        setTagStatusAction(shop, tagId, status),
      ]);
      const err = assignResult.error ?? statusResult.error;
      if (err) {
        setError(err);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "480px" }}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Assigned product</label>
        <select
          style={inputStyle}
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setSaved(false);
            if (e.target.value && status === "unassigned") setStatus("active");
            if (!e.target.value) setStatus("unassigned");
          }}
        >
          <option value="">— Unassigned —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Status</label>
        <select
          style={inputStyle}
          value={status}
          onChange={(e) => { setStatus(e.target.value as TagStatus); setSaved(false); }}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: "#c00", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        style={{ padding: "0.6rem 1.25rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? "Saving…" : saved ? "Saved ✓" : "Save tag"}
      </button>
    </form>
  );
}
