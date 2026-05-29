"use client";

import { useState, useTransition, useEffect } from "react";
import { sendNotificationAction, getRecipientCountAction } from "./actions.js";
import type { ProductWithStatus } from "@nfc/db";
import type { NotificationEventType } from "@nfc/db";

interface Props {
  shop: string;
  products: ProductWithStatus[];
}

const EVENT_TYPES: { value: NotificationEventType; label: string; description: string }[] = [
  { value: "sale",    label: "Sale",    description: "Product is on sale / price drop" },
  { value: "offer",   label: "Offer",   description: "Exclusive discount code" },
  { value: "restock", label: "Restock", description: "Back in stock" },
  { value: "manual",  label: "General", description: "Any message — sends to all who tapped" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  border: "1px solid #ddd",
  borderRadius: "6px",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#444",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: "0.35rem",
};

export function NotificationComposer({ shop, products }: Props) {
  const [productId,  setProductId]  = useState(products[0]?.id ?? "");
  const [eventType,  setEventType]  = useState<NotificationEventType>("sale");
  const [message,    setMessage]    = useState("");
  const [count,      setCount]      = useState<number | null>(null);
  const [result,     setResult]     = useState<{ sent: number; failed: number } | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [isPending,  startTransition] = useTransition();
  const [isCounting, startCount]    = useTransition();

  const charCount = message.length;
  const segments  = Math.ceil(charCount / 160) || 1;

  // Update recipient count whenever product or event type changes
  useEffect(() => {
    if (!productId) return;
    setCount(null);
    startCount(async () => {
      const res = await getRecipientCountAction(shop, productId, eventType);
      setCount(res.count);
    });
  }, [shop, productId, eventType]);

  function handleSend() {
    setResult(null);
    setError(null);
    startTransition(async () => {
      const res = await sendNotificationAction(shop, productId, eventType, message);
      if (res.error) {
        setError(res.error);
      } else {
        setResult({ sent: res.sent, failed: res.failed });
        setMessage("");
      }
    });
  }

  if (products.length === 0) {
    return (
      <p style={{ fontSize: "0.875rem", color: "#888" }}>
        No active products with tags found. Assign and deploy tags to products first.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Product picker */}
      <div>
        <label style={labelStyle}>Product</label>
        <select
          value={productId}
          onChange={(e) => { setProductId(e.target.value); setResult(null); setError(null); }}
          style={{ ...inputStyle, background: "#fff" }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* Event type */}
      <div>
        <label style={labelStyle}>Notification type</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {EVENT_TYPES.map((et) => (
            <button
              key={et.value}
              onClick={() => { setEventType(et.value); setResult(null); setError(null); }}
              style={{
                padding: "0.6rem 0.75rem",
                border: `2px solid ${eventType === et.value ? "#111" : "#ddd"}`,
                borderRadius: "6px",
                background: eventType === et.value ? "#111" : "#fff",
                color: eventType === et.value ? "#fff" : "#333",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div>{et.label}</div>
              <div style={{ fontWeight: 400, opacity: 0.75, marginTop: "0.1rem" }}>{et.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recipient count */}
      <div style={{ fontSize: "0.8rem", color: isCounting ? "#999" : "#555" }}>
        {isCounting
          ? "Counting recipients…"
          : count === null
            ? ""
            : count === 0
              ? "No subscribers match this selection yet."
              : `${count} recipient${count !== 1 ? "s" : ""} will receive this message.`}
      </div>

      {/* Message */}
      <div>
        <label style={labelStyle}>Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Hey! The Côtes du Rhône you loved is 20% off this weekend. Tap your bottle to grab the code."
          rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
        <p style={{ fontSize: "0.7rem", color: charCount > 440 ? "#c00" : "#bbb", marginTop: "0.25rem" }}>
          {charCount}/480 characters · {segments} SMS segment{segments !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Send */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          onClick={handleSend}
          disabled={isPending || !message.trim() || count === 0}
          style={{
            padding: "0.55rem 1.5rem",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: isPending || !message.trim() || count === 0 ? "not-allowed" : "pointer",
            opacity: isPending || !message.trim() || count === 0 ? 0.5 : 1,
          }}
        >
          {isPending ? "Sending…" : `Send to ${count ?? "…"}`}
        </button>
        {result && (
          <span style={{ fontSize: "0.85rem", color: "#166534" }}>
            ✓ {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ""}
          </span>
        )}
        {error && <span style={{ fontSize: "0.85rem", color: "#c00" }}>{error}</span>}
      </div>
    </div>
  );
}
