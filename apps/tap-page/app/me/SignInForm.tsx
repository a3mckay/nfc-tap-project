"use client";

import { useState } from "react";

export function SignInForm() {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/auth/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), redirect: "/me" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Couldn't send link. Try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Network error. Try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ padding: "1.5rem", background: "#f9f9f9", borderRadius: "8px", textAlign: "center" }}>
        <p style={{ fontSize: "1rem", fontWeight: 600, color: "#111", marginBottom: "0.5rem" }}>📨 Check your inbox</p>
        <p style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.5 }}>
          A sign-in link is on its way to <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        disabled={status === "sending"}
        style={{
          width: "100%", padding: "0.65rem 0.85rem", fontSize: "0.95rem",
          border: "1px solid #ddd", borderRadius: "6px", marginBottom: "0.75rem",
          fontFamily: "inherit", boxSizing: "border-box",
        }}
      />
      <button type="submit" disabled={status === "sending" || !email.trim()}
        style={{
          width: "100%", padding: "0.65rem 1rem", background: "#111", color: "#fff",
          border: "none", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 600,
          cursor: status === "sending" || !email.trim() ? "default" : "pointer",
          opacity: status === "sending" || !email.trim() ? 0.6 : 1,
        }}>
        {status === "sending" ? "Sending…" : "Send sign-in link"}
      </button>
      {error && <p style={{ fontSize: "0.8rem", color: "#c00", marginTop: "0.75rem" }}>{error}</p>}
    </form>
  );
}
