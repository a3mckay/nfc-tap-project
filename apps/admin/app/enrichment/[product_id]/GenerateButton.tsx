"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateEnrichmentAction } from "./actions.js";

export function GenerateButton({
  shop,
  productId,
}: {
  shop: string;
  productId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    if (!confirm("Generate AI copy for this product? This will overwrite any existing content.")) return;
    startTransition(async () => {
      const r = await generateEnrichmentAction(shop, productId);
      if (r.error) {
        alert(`Generation failed: ${r.error}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
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
      }}
    >
      {pending ? "Generating…" : "✨ Generate with AI"}
    </button>
  );
}
