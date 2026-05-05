"use client";

import { useTransition } from "react";
import { setReviewStatusAction, setAwardStatusAction } from "./actions.js";

interface BaseProps {
  id: string;
  productTitle: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  body: string;
}

interface ReviewProps extends BaseProps {
  kind: "review";
  rating: string | null;
  author: string | null;
}

interface AwardProps extends BaseProps {
  kind: "award";
  awardingBody: string | null;
  year: number | null;
}

type Props = ReviewProps | AwardProps;

export function PendingItem(props: Props) {
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      if (props.kind === "review") await setReviewStatusAction(props.id, "approved");
      else await setAwardStatusAction(props.id, "approved");
    });
  }
  function reject() {
    startTransition(async () => {
      if (props.kind === "review") await setReviewStatusAction(props.id, "rejected");
      else await setAwardStatusAction(props.id, "rejected");
    });
  }

  return (
    <div style={{ padding: "1rem 1.25rem", border: "1px solid #eee", borderRadius: "8px", marginBottom: "0.75rem", opacity: pending ? 0.5 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "0.62rem", padding: "1px 6px", background: props.kind === "award" ? "#fef3c7" : "#e0e7ff", color: props.kind === "award" ? "#92400e" : "#3730a3", borderRadius: "3px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {props.kind}
            </span>
            <span style={{ fontSize: "0.78rem", color: "#666" }}>{props.productTitle ?? "—"}</span>
          </div>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111", marginBottom: "2px" }}>
            {props.sourceLabel ?? "Unknown source"}
            {props.kind === "review" && props.author && ` · ${props.author}`}
            {props.kind === "review" && props.rating && ` · ${parseFloat(props.rating).toFixed(1)}★`}
            {props.kind === "award" && props.awardingBody && ` · ${props.awardingBody}`}
            {props.kind === "award" && props.year && ` · ${props.year}`}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#444", lineHeight: 1.5, marginBottom: "0.5rem" }}>
            &ldquo;{props.body}&rdquo;
          </p>
          {props.sourceUrl && (
            <a href={props.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "#888", textDecoration: "none" }}>
              {new URL(props.sourceUrl).hostname} →
            </a>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button type="button" onClick={approve} disabled={pending}
          style={{ padding: "0.35rem 0.875rem", background: "#166534", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.78rem", fontWeight: 600, cursor: pending ? "default" : "pointer" }}>
          Approve
        </button>
        <button type="button" onClick={reject} disabled={pending}
          style={{ padding: "0.35rem 0.875rem", background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.78rem", cursor: pending ? "default" : "pointer" }}>
          Reject
        </button>
      </div>
    </div>
  );
}
