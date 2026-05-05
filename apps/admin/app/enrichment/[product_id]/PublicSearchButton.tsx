"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { runPublicSearchForProductAction } from "../../reviews/public/actions.js";

interface Props {
  shop: string;
  productId: string;
  publicReviewsEnabled: boolean;
}

export function PublicSearchButton({ shop, productId, publicReviewsEnabled }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ found: number; stored: number; error?: string } | null>(null);

  if (!publicReviewsEnabled) {
    return (
      <p style={{ fontSize: "0.78rem", color: "#888", padding: "0.875rem", background: "#fafafa", border: "1px solid #eee", borderRadius: "6px" }}>
        Public Reviews is off.{" "}
        <Link href={`/reviews?shop=${shop}`} style={{ color: "#555" }}>Enable in Reviews settings</Link>
        {" "}to search the web for reviews and awards of this product.
      </p>
    );
  }

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const r = await runPublicSearchForProductAction(shop, productId);
      setResult({ found: r.items_found, stored: r.items_stored, ...(r.error ? { error: r.error } : {}) });
    });
  }

  return (
    <div style={{ padding: "0.875rem 1rem", background: "#fafafa", border: "1px solid #eee", borderRadius: "6px" }}>
      <p style={{ fontSize: "0.85rem", color: "#444", marginBottom: "0.5rem" }}>
        Search the web for reviews, awards, and press mentions of this product.
      </p>
      <button type="button" onClick={handleClick} disabled={pending}
        style={{
          padding: "0.4rem 0.875rem", background: "#111", color: "#fff",
          border: "none", borderRadius: "4px", fontSize: "0.78rem", fontWeight: 600,
          cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
        }}>
        {pending ? "Searching the web…" : "Search the web"}
      </button>
      {result && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: result.error ? "#c00" : "#444" }}>
          {result.error
            ? `Error: ${result.error}`
            : result.stored === 0
              ? "Nothing relevant found."
              : <>Found {result.stored} item{result.stored === 1 ? "" : "s"}. <Link href={`/reviews/pending?shop=${shop}`} style={{ color: "#3730a3" }}>Review pending →</Link></>
          }
        </p>
      )}
    </div>
  );
}
