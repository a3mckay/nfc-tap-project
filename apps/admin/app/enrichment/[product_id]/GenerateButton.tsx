"use client";

import { useTransition } from "react";
import { generateEnrichmentAction } from "./actions.js";
import type { GeneratedDraft } from "./actions.js";

interface Props {
  shop: string;
  productId: string;
  onDraftReady: (draft: GeneratedDraft) => void;
  onGeneratingChange: (generating: boolean) => void;
}

export function GenerateButton({ shop, productId, onDraftReady, onGeneratingChange }: Props) {
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    if (!confirm("Generate AI copy for this product? This will overwrite any existing content.")) return;
    onGeneratingChange(true);
    startTransition(async () => {
      const r = await generateEnrichmentAction(shop, productId);
      if (r.error) {
        alert(`Generation failed: ${r.error}`);
        onGeneratingChange(false);
      } else if (r.draft) {
        onDraftReady(r.draft);
        onGeneratingChange(false);
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
