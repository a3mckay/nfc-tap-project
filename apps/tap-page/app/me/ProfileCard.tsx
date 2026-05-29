"use client";

import { useState, useTransition } from "react";
import { saveProfileAction } from "./actions.js";

interface Props {
  initialName: string;
  initialPhone: string;
  initialChannel: "sms" | "whatsapp" | "email";
}

const CHANNELS: { value: "sms" | "whatsapp" | "email"; label: string; hint: string }[] = [
  { value: "sms",      label: "SMS",      hint: "Text message" },
  { value: "whatsapp", label: "WhatsApp", hint: "WhatsApp" },
  { value: "email",    label: "Email",    hint: "Email" },
];

export function ProfileCard({ initialName, initialPhone, initialChannel }: Props) {
  const [name,    setName]    = useState(initialName);
  const [phone,   setPhone]   = useState(initialPhone);
  const [channel, setChannel] = useState(initialChannel);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await saveProfileAction({ displayName: name, phone, preferredChannel: channel });
      if (res.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    boxSizing: "border-box",
    background: "#fff",
  };

  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <p style={{
        fontSize: "0.7rem", fontWeight: 700, color: "#aaa",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem",
      }}>
        Profile
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Name */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#666", marginBottom: "0.3rem" }}>
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
            placeholder="Your name"
            style={inputStyle}
          />
        </div>

        {/* Phone */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#666", marginBottom: "0.3rem" }}>
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
            placeholder="+1 416 555 0100"
            style={inputStyle}
          />
          <p style={{ fontSize: "0.7rem", color: "#bbb", marginTop: "0.25rem" }}>
            Used for SMS notifications. Include country code.
          </p>
        </div>

        {/* Preferred channel */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "#666", marginBottom: "0.4rem" }}>
            Preferred contact method
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {CHANNELS.map((c) => (
              <button
                key={c.value}
                onClick={() => { setChannel(c.value); setSaved(false); }}
                style={{
                  flex: 1,
                  padding: "0.4rem 0",
                  border: `2px solid ${channel === c.value ? "#111" : "#e0e0e0"}`,
                  borderRadius: "6px",
                  background: channel === c.value ? "#111" : "#fff",
                  color: channel === c.value ? "#fff" : "#555",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.875rem" }}>
        <button
          onClick={handleSave}
          disabled={isPending}
          style={{
            padding: "0.45rem 1.25rem",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && <span style={{ fontSize: "0.8rem", color: "#166534" }}>Saved ✓</span>}
        {error && <span style={{ fontSize: "0.8rem", color: "#c00" }}>{error}</span>}
      </div>
    </section>
  );
}
