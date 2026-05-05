"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setPublicReviewsEnabledAction } from "./public/actions.js";

interface Props {
  shop: string;
  initialEnabled: boolean;
  pendingCount: number;
}

export function PublicReviewsSection({ shop, initialEnabled, pendingCount }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      await setPublicReviewsEnabledAction(shop, next);
    });
  }

  return (
    <section style={{ padding: "1.25rem", background: "#fafafa", border: "1px solid #eee", borderRadius: "8px", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#111", marginBottom: "0.4rem" }}>
            Public Reviews
          </p>
          <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.5, marginBottom: "0.875rem" }}>
            Search the web for reviews, awards, and press mentions of your products. We&apos;ll find them, you approve them, then they appear on tap pages with source citations.
          </p>
          {enabled && (
            <Link href={`/reviews/pending?shop=${shop}`} style={{ display: "inline-block", fontSize: "0.82rem", color: "#3730a3", textDecoration: "none", padding: "0.35rem 0.875rem", background: "#e0e7ff", borderRadius: "4px", fontWeight: 600 }}>
              Pending approvals ({pendingCount}) →
            </Link>
          )}
        </div>
        <button type="button" onClick={handleToggle} disabled={pending}
          style={{
            padding: "0.45rem 1rem",
            background: enabled ? "#166534" : "#fff",
            color: enabled ? "#fff" : "#111",
            border: enabled ? "none" : "1px solid #ddd",
            borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600,
            cursor: pending ? "default" : "pointer", whiteSpace: "nowrap",
            opacity: pending ? 0.7 : 1,
          }}>
          {enabled ? "Enabled ✓" : "Enable"}
        </button>
      </div>
    </section>
  );
}
