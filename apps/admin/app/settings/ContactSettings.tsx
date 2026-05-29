"use client";

import { useState, useTransition } from "react";
import { saveContactInfoAction } from "./actions.js";

interface Props {
  shop: string;
  initialWhatsapp: string;
  initialSms: string;
}

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

export function ContactSettings({ shop, initialWhatsapp, initialSms }: Props) {
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [sms, setSms]           = useState(initialSms);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveContactInfoAction(shop, whatsapp, sms);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div>
      <div style={{ display: "grid", gap: "1rem", maxWidth: "400px", marginBottom: "1rem" }}>
        <div>
          <label style={labelStyle}>WhatsApp number</label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => { setWhatsapp(e.target.value); setSaved(false); }}
            placeholder="+1 416 555 0100"
            style={inputStyle}
          />
          <p style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.3rem" }}>
            Include country code (e.g. +1 for Canada/US). Customers can message you directly from the tap page.
          </p>
        </div>

        <div>
          <label style={labelStyle}>SMS number</label>
          <input
            type="tel"
            value={sms}
            onChange={(e) => { setSms(e.target.value); setSaved(false); }}
            placeholder="+1 416 555 0100"
            style={inputStyle}
          />
          <p style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.3rem" }}>
            Fallback for customers without WhatsApp. Opens the phone's native messages app.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          onClick={handleSave}
          disabled={isPending}
          style={{
            padding: "0.5rem 1.25rem",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && <span style={{ fontSize: "0.85rem", color: "#166534" }}>Saved ✓</span>}
        {error && <span style={{ fontSize: "0.85rem", color: "#c00" }}>{error}</span>}
      </div>
    </div>
  );
}
