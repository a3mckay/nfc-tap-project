"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GenerateButton } from "./GenerateButton.js";
import { EnrichmentForm } from "./EnrichmentForm.js";
import { PublicSearchButton } from "./PublicSearchButton.js";
import type { EnrichmentFormData, GeneratedDraft } from "./actions.js";

interface Props {
  shop: string;
  productId: string;
  initial: EnrichmentFormData;
  productTitle: string;
  isAiGenerated: boolean;
  publicReviewsEnabled: boolean;
}

const SHIMMER_CSS = `
@keyframes nfc-gen-shimmer {
  0%   { left: -45%; }
  100% { left: 110%; }
}
`;

export function EnrichmentPageClient({
  shop,
  productId,
  initial,
  productTitle,
  isAiGenerated,
  publicReviewsEnabled,
}: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<EnrichmentFormData>(initial);
  // Incrementing this key forces EnrichmentForm to remount with the new formData as initial state.
  const [formKey, setFormKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);

  function handleDraftReady(draft: GeneratedDraft) {
    setFormData((prev) => ({
      ...prev,
      backstory: draft.backstory || prev.backstory,
      materials: draft.materials || prev.materials,
      fit_notes: draft.fit_notes || prev.fit_notes,
      care_instructions: draft.care_instructions || prev.care_instructions,
      sustainability_notes: draft.sustainability_notes || prev.sustainability_notes,
      reasons_to_buy_text: draft.reasons_to_buy?.join("\n") ?? prev.reasons_to_buy_text,
      staff_quote: draft.staff_quote || prev.staff_quote,
      faq: draft.faq?.length ? draft.faq : prev.faq,
    }));
    setFormKey((k) => k + 1);
    setJustGenerated(true);
    setTimeout(() => setJustGenerated(false), 4000);
    router.refresh(); // keep server state in sync in the background
  }

  return (
    <>
      {/* Button row */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: isGenerating ? "0.75rem" : "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <GenerateButton
          shop={shop}
          productId={productId}
          onDraftReady={handleDraftReady}
          onGeneratingChange={setIsGenerating}
        />
        <PublicSearchButton
          shop={shop}
          productId={productId}
          publicReviewsEnabled={publicReviewsEnabled}
        />
      </div>

      {/* Loading bar + status */}
      {isGenerating && (
        <div style={{ marginBottom: "1.5rem" }}>
          <style>{SHIMMER_CSS}</style>
          <div
            style={{
              height: "4px",
              background: "#e5e7eb",
              borderRadius: "9999px",
              overflow: "hidden",
              position: "relative",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                height: "100%",
                width: "45%",
                background:
                  "linear-gradient(90deg, transparent, #6366f1, #8b5cf6, transparent)",
                borderRadius: "9999px",
                animation: "nfc-gen-shimmer 1.4s ease-in-out infinite",
              }}
            />
          </div>
          <p style={{ fontSize: "0.78rem", color: "#6366f1" }}>
            ✨ Searching the web and generating copy — this takes about 15 seconds…
          </p>
        </div>
      )}

      {/* Success banner */}
      {justGenerated && !isGenerating && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.65rem 1rem",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "6px",
            fontSize: "0.82rem",
            color: "#15803d",
          }}
        >
          ✓ AI copy generated and filled in below. Review and click <strong>Save details</strong> when ready.
        </div>
      )}

      {/* Form — remounts when formKey changes so it picks up the new initial values */}
      <EnrichmentForm
        key={formKey}
        initial={formData}
        productTitle={productTitle}
        isAiGenerated={isAiGenerated || formKey > 0}
      />
    </>
  );
}
