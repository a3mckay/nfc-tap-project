"use client";

// A basic 19+ age gate for cannabis pages (founder decision, 2026-10-07). The
// page sends nothing about the product until the visitor says they're of age.
// The age comes in as a prop: this runs in the browser, so it can't import
// server modules (src/cannabis.ts uses @nfc/db).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmAgeAction } from "./age-actions.js";

const button: React.CSSProperties = {
  width: "100%", padding: "0.85rem 1rem", borderRadius: "10px", fontSize: "1rem", fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};

export function AgeGate({ storeName, minAge }: { storeName: string; minAge: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [underAge, setUnderAge] = useState(false);

  function confirm() {
    startTransition(async () => {
      await confirmAgeAction();
      router.refresh();
    });
  }

  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", background: "#fff" }}>
      <div style={{ maxWidth: "360px", width: "100%", textAlign: "center" }}>
        {storeName && <p style={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 1rem" }}>{storeName}</p>}
        {underAge ? (
          <p style={{ fontSize: "1.05rem", color: "#111", lineHeight: 1.5 }}>
            Sorry, you must be {minAge} or older to view this page.
          </p>
        ) : (
          <>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#111", margin: "0 0 0.5rem" }}>Are you {minAge} or older?</h1>
            <p style={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
              This page is about a cannabis product. You must be of legal age to view it.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <button type="button" onClick={confirm} disabled={isPending} style={{ ...button, background: "#111", color: "#fff", border: "none" }}>
                {isPending ? "One moment…" : `Yes, I'm ${minAge} or older`}
              </button>
              <button type="button" onClick={() => setUnderAge(true)} style={{ ...button, background: "#fff", color: "#111", border: "1px solid #ddd" }}>
                No, I&apos;m under {minAge}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
