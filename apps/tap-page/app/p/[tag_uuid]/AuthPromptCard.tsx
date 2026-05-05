"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY     = "nfc_tap_history_v1";
const DISMISS_KEY     = "nfc_auth_prompt_dismissed_v1";
const PROMPT_THRESHOLD = 3;

interface Props {
  isAuthenticated: boolean;
  primaryColor: string;
  currentTagUuid: string;
}

export function AuthPromptCard({ isAuthenticated, primaryColor, currentTagUuid }: Props) {
  const [shouldShow, setShouldShow] = useState(false);
  const [email, setEmail]           = useState("");
  const [status, setStatus]         = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
      if (Array.isArray(parsed) && parsed.length >= PROMPT_THRESHOLD) {
        setShouldShow(true);
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  if (!shouldShow || isAuthenticated) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShouldShow(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/auth/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), redirect: `/p/${currentTagUuid}` }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setErrorMsg(body.error ?? "Couldn't send link. Try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setErrorMsg("Network error. Try again.");
      setStatus("error");
    }
  }

  return (
    <section style={{
      marginTop: "2rem",
      padding: "1.25rem",
      background: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)",
      border: "1px solid #eee",
      borderRadius: "12px",
    }}>
      {status === "sent" ? (
        <div>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#111", marginBottom: "0.5rem" }}>
            Check your inbox 📨
          </p>
          <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.5 }}>
            We sent a sign-in link to <strong>{email}</strong>. Click it to access your collection on any device.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#111", marginBottom: "0.4rem" }}>
            Save your collection
          </p>
          <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.5, marginBottom: "1rem" }}>
            We&apos;ll email you exclusive offers from stores you visit and let you access your tap history on any device. No password needed.
          </p>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={status === "sending"}
              style={{
                flex: 1, padding: "0.55rem 0.75rem", fontSize: "0.9rem",
                border: "1px solid #ddd", borderRadius: "6px",
                fontFamily: "inherit", background: "#fff",
              }}
            />
            <button type="submit" disabled={status === "sending" || !email.trim()}
              style={{
                padding: "0.55rem 1rem", background: primaryColor, color: "#fff",
                border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600,
                cursor: status === "sending" || !email.trim() ? "default" : "pointer",
                opacity: status === "sending" || !email.trim() ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}>
              {status === "sending" ? "Sending…" : "Save"}
            </button>
          </form>
          {errorMsg && <p style={{ fontSize: "0.78rem", color: "#c00", marginBottom: "0.5rem" }}>{errorMsg}</p>}
          <button type="button" onClick={handleDismiss}
            style={{ fontSize: "0.75rem", color: "#999", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            Not now
          </button>
        </>
      )}
    </section>
  );
}
