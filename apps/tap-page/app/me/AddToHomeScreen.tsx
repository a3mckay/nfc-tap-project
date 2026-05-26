"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
}

export function AddToHomeScreen() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [dismissed, setDismissed] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isStandalone()) return;

    const p = detectPlatform();
    if (!p) return;

    // Check if user has already dismissed
    if (sessionStorage.getItem("aths-dismissed")) return;

    setPlatform(p);

    // Android: capture the browser's native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem("aths-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setDismissed(true);
    }
  }

  if (!platform || dismissed) return null;

  return (
    <div style={{
      margin: "0 0 1.5rem",
      padding: "0.75rem 1rem",
      background: "#f5f5f5",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.75rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>📲</span>
        <p style={{ fontSize: "0.8rem", color: "#444", margin: 0, lineHeight: 1.4 }}>
          {platform === "ios"
            ? <>Add to your home screen — tap <strong>Share</strong> then <strong>Add to Home Screen</strong></>
            : <>Add TapShelf to your home screen for quick access</>}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        {platform === "android" && installPrompt && (
          <button
            onClick={install}
            style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.35rem 0.75rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
          >
            Add
          </button>
        )}
        <button
          onClick={dismiss}
          style={{ fontSize: "0.75rem", color: "#999", background: "none", border: "none", cursor: "pointer", padding: "0.35rem 0.5rem" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
