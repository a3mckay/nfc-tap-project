"use client";

import { useState, useTransition } from "react";
import { subscribeToNotificationsAction } from "./actions.js";

interface Props {
  storeId: string;
  productId: string;
  sessionId: string;
  customerId: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  primaryColor?: string;
}

type Step = "prompt" | "form" | "done";

export function NotifyMe({
  storeId,
  productId,
  sessionId,
  customerId,
  customerPhone,
  customerEmail,
  primaryColor = "#000000",
}: Props) {
  // If the customer already has contact info, they can subscribe in one tap
  const alreadyHasContact = !!(customerPhone || customerEmail);

  const [step, setStep]   = useState<Step>("prompt");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOneClick() {
    setError(null);
    startTransition(async () => {
      const res = await subscribeToNotificationsAction({
        storeId, productId, sessionId, customerId,
        contactPhone: customerPhone,
        contactEmail: customerEmail,
      });
      if (res.error) { setError(res.error); } else { setStep("done"); }
    });
  }

  function handleSubmit() {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) { setError("Enter a phone number or email."); return; }
    const isPhone = /^\+?[\d\s\-().]{7,}$/.test(trimmed);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!isPhone && !isEmail) { setError("Enter a valid phone number or email address."); return; }

    startTransition(async () => {
      const res = await subscribeToNotificationsAction({
        storeId, productId, sessionId, customerId,
        contactPhone: isPhone ? trimmed : null,
        contactEmail: isEmail ? trimmed : null,
      });
      if (res.error) { setError(res.error); } else { setStep("done"); }
    });
  }

  if (step === "done") {
    return (
      <div style={{
        margin: "1rem 1.25rem 0",
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        fontSize: "0.85rem",
        color: "#166534",
        fontWeight: 500,
      }}>
        ✓ You&apos;re on the list — we&apos;ll let you know if there&apos;s a sale or restock.
      </div>
    );
  }

  if (step === "prompt") {
    return (
      <div style={{
        margin: "1rem 1.25rem 0",
        padding: "0.875rem 1rem",
        borderRadius: "8px",
        border: "1px solid #eee",
        background: "#fafafa",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}>
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#333", margin: "0 0 0.1rem" }}>
            Get notified about this product
          </p>
          <p style={{ fontSize: "0.75rem", color: "#888", margin: 0 }}>
            Sales, restocks, exclusive offers
          </p>
        </div>
        {alreadyHasContact ? (
          <button
            onClick={handleOneClick}
            disabled={isPending}
            style={{
              padding: "0.45rem 1rem",
              background: primaryColor,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: isPending ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {isPending ? "…" : "Notify me"}
          </button>
        ) : (
          <button
            onClick={() => setStep("form")}
            style={{
              padding: "0.45rem 1rem",
              background: primaryColor,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Notify me
          </button>
        )}
      </div>
    );
  }

  // step === "form"
  return (
    <div style={{
      margin: "1rem 1.25rem 0",
      padding: "0.875rem 1rem",
      borderRadius: "8px",
      border: "1px solid #eee",
      background: "#fafafa",
    }}>
      <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#333", margin: "0 0 0.6rem" }}>
        Where should we reach you?
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          placeholder="Phone number or email"
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            border: `1px solid ${error ? "#c00" : "#ddd"}`,
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontFamily: "inherit",
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={isPending}
          style={{
            padding: "0.5rem 1rem",
            background: primaryColor,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          {isPending ? "…" : "Done"}
        </button>
      </div>
      {error && <p style={{ fontSize: "0.75rem", color: "#c00", marginTop: "0.35rem" }}>{error}</p>}
      <p style={{ fontSize: "0.7rem", color: "#bbb", marginTop: "0.35rem" }}>
        SMS preferred. We&apos;ll only message you about this product.
      </p>
    </div>
  );
}
