"use client";

import { useState, useEffect } from "react";

interface Props {
  code: string;
  message: string;
  expiresAt: string | null;
  primaryColor: string;
}

const SEEN_PREFIX = "nfc_offer_seen_";

// Slide-up card that reveals an exclusive discount code. Persists "seen" state per code
// in localStorage so we don't replay the reveal animation on every page view — but the
// card itself stays visible so the customer can re-copy the code.
export function OfferReveal({ code, message, expiresAt, primaryColor }: Props) {
  const [animateIn, setAnimateIn] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const key = SEEN_PREFIX + code;
    const seen = !!localStorage.getItem(key);
    if (!seen) {
      // Slight delay so the customer sees the page first, then the surprise.
      const t = setTimeout(() => {
        setAnimateIn(true);
        localStorage.setItem(key, String(Date.now()));
      }, 800);
      return () => clearTimeout(t);
    } else {
      setAnimateIn(true);
    }
  }, [code]);

  function handleCopy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section style={{
      marginTop: "2rem",
      padding: "1.25rem",
      borderRadius: "12px",
      border: `2px dashed ${primaryColor}`,
      background: "#fff",
      transform: animateIn ? "translateY(0)" : "translateY(20px)",
      opacity: animateIn ? 1 : 0,
      transition: "all 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2)",
    }}>
      <p style={{ fontSize: "0.7rem", fontWeight: 700, color: primaryColor, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.4rem" }}>
        Exclusive offer
      </p>
      <p style={{ fontSize: "0.95rem", color: "#111", lineHeight: 1.5, marginBottom: "0.875rem" }}>
        {message}
      </p>
      <button type="button" onClick={handleCopy}
        style={{
          width: "100%", padding: "0.75rem", background: primaryColor, color: "#fff",
          border: "none", borderRadius: "8px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.1em",
        }}>
        {code}
        <span style={{ fontSize: "0.7rem", opacity: 0.7, fontFamily: "system-ui, sans-serif", fontWeight: 500, letterSpacing: 0 }}>
          {copied ? "Copied ✓" : "Tap to copy"}
        </span>
      </button>
      {expiresAt && (
        <p style={{ fontSize: "0.72rem", color: "#888", marginTop: "0.5rem", textAlign: "center" }}>
          Valid until {new Date(expiresAt).toLocaleDateString()}
        </p>
      )}
    </section>
  );
}
