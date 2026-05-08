"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { runPublicSearchForProductAction } from "../../reviews/public/actions.js";
import {
  getPendingItemsForProductAction,
  approveItemAction,
  rejectItemAction,
  type PendingProductItem,
} from "./reviewActions.js";

type PageStatus = "idle" | "searching" | "reviewing";

interface Props {
  shop: string;
  productId: string;
  publicReviewsEnabled: boolean;
}

export function PublicSearchButton({ shop, productId, publicReviewsEnabled }: Props) {
  const [pageStatus, setPageStatus] = useState<PageStatus>("idle");
  const [pendingItems, setPendingItems] = useState<PendingProductItem[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!publicReviewsEnabled) {
    return (
      <p style={{ fontSize: "0.78rem", color: "#888", padding: "0.875rem", background: "#fafafa", border: "1px solid #eee", borderRadius: "6px" }}>
        Public Reviews is off.{" "}
        <Link href={`/reviews?shop=${shop}`} style={{ color: "#555" }}>Enable in Reviews settings</Link>
        {" "}to search the web for reviews and awards of this product.
      </p>
    );
  }

  function handleSearch() {
    setError(null);
    setPageStatus("searching");
    startTransition(async () => {
      const r = await runPublicSearchForProductAction(shop, productId);
      if (r.error) {
        setError(r.error);
        setPageStatus("idle");
        return;
      }
      // Load pending items for just this product
      const { items } = await getPendingItemsForProductAction(productId);
      if (items.length === 0) {
        setError("Nothing relevant found for this product.");
        setPageStatus("idle");
        return;
      }
      setPendingItems(items);
      setApprovedCount(0);
      setPageStatus("reviewing");
    });
  }

  function handleApprove(id: string, kind: "review" | "award") {
    startTransition(async () => {
      await approveItemAction(id, kind);
      setPendingItems((prev) => prev.filter((item) => item.id !== id));
      setApprovedCount((c) => c + 1);
    });
  }

  function handleReject(id: string, kind: "review" | "award") {
    startTransition(async () => {
      await rejectItemAction(id, kind);
      setPendingItems((prev) => prev.filter((item) => item.id !== id));
    });
  }

  return (
    <div style={{ padding: "0.875rem 1rem", background: "#fafafa", border: "1px solid #eee", borderRadius: "6px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <p style={{ fontSize: "0.85rem", color: "#444", margin: 0 }}>
          Search the web for reviews, awards, and press mentions of this product.
        </p>
        <button
          type="button"
          onClick={handleSearch}
          disabled={pending || pageStatus === "searching"}
          style={{
            flexShrink: 0,
            padding: "0.4rem 0.875rem",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: pending || pageStatus === "searching" ? "default" : "pointer",
            opacity: pending || pageStatus === "searching" ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {pageStatus === "searching" ? "Searching…" : "Search the web"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#c00" }}>{error}</p>
      )}

      {/* Inline review cards */}
      {pageStatus === "reviewing" && pendingItems.length > 0 && (
        <div style={{ marginTop: "0.875rem", borderTop: "1px solid #e5e7eb", paddingTop: "0.875rem" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#444", marginBottom: "0.625rem" }}>
            Found {pendingItems.length} item{pendingItems.length === 1 ? "" : "s"} — approve to show on your tap page
          </p>
          {pendingItems.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "0.75rem",
                marginBottom: "0.5rem",
                background: "#fff",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {/* Meta row */}
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                <span style={{
                  fontSize: "0.6rem", padding: "1px 5px",
                  background: item.kind === "award" ? "#fef3c7" : "#e0e7ff",
                  color: item.kind === "award" ? "#92400e" : "#3730a3",
                  borderRadius: "3px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  {item.kind}
                </span>
                {item.rating !== null && (
                  <span style={{ fontSize: "0.75rem", color: "#555" }}>{item.rating.toFixed(1)}★</span>
                )}
                {item.author && (
                  <span style={{ fontSize: "0.75rem", color: "#555" }}>· {item.author}</span>
                )}
                {item.source_label && (
                  <span style={{ fontSize: "0.72rem", color: "#888" }}>· {item.source_label}</span>
                )}
                {item.kind === "award" && item.awarding_body && (
                  <span style={{ fontSize: "0.72rem", color: "#888" }}>· {item.awarding_body}{item.year ? ` ${item.year}` : ""}</span>
                )}
              </div>

              {/* Body */}
              <p style={{ fontSize: "0.82rem", color: "#333", lineHeight: 1.5, marginBottom: "0.4rem" }}>
                &ldquo;{item.body}&rdquo;
              </p>

              {/* Source link */}
              {item.source_url && (() => {
                try {
                  return (
                    <a href={item.source_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: "0.7rem", color: "#888", display: "block", marginBottom: "0.5rem", textDecoration: "none" }}>
                      {new URL(item.source_url).hostname} →
                    </a>
                  );
                } catch { return null; }
              })()}

              {/* Approve / Reject */}
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => handleApprove(item.id, item.kind)}
                  disabled={pending}
                  style={{
                    padding: "0.3rem 0.75rem",
                    background: "#166534", color: "#fff",
                    border: "none", borderRadius: "4px",
                    fontSize: "0.75rem", fontWeight: 600,
                    cursor: pending ? "default" : "pointer",
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(item.id, item.kind)}
                  disabled={pending}
                  style={{
                    padding: "0.3rem 0.75rem",
                    background: "transparent", color: "#666",
                    border: "1px solid #ddd", borderRadius: "4px",
                    fontSize: "0.75rem",
                    cursor: pending ? "default" : "pointer",
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All done — show approved count */}
      {pageStatus === "reviewing" && pendingItems.length === 0 && (
        <div style={{
          marginTop: "0.625rem",
          padding: "0.6rem 0.875rem",
          background: approvedCount > 0 ? "#f0fdf4" : "#fafafa",
          border: `1px solid ${approvedCount > 0 ? "#86efac" : "#e5e7eb"}`,
          borderRadius: "6px",
          fontSize: "0.78rem",
          color: approvedCount > 0 ? "#15803d" : "#666",
        }}>
          {approvedCount > 0
            ? `✓ ${approvedCount} item${approvedCount === 1 ? "" : "s"} approved — now live on your tap page`
            : "All items dismissed."}
        </div>
      )}
    </div>
  );
}
