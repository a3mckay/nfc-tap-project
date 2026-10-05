"use client";

import { useEffect, useState } from "react";
import { CHAT_EVENT } from "@/ask/client.js";

const STORAGE_KEY = "nfc_tap_history_v1";
const MAX_PICKS = 20;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface LocalTap {
  tagUuid: string;
  productTitle: string;
  productImageUrl: string | null;
  tappedAt: number;
}

// ── storage helpers ──────────────────────────────────────────────────────────

function loadHistory(): LocalTap[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalTap[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(taps: LocalTap[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taps.slice(0, MAX_PICKS)));
  } catch { /* quota exceeded — silently skip */ }
}

function expireOld(taps: LocalTap[]): LocalTap[] {
  const cutoff = Date.now() - SESSION_TTL_MS;
  return taps.filter((t) => t.tappedAt > cutoff);
}

// Move current tag to front; update timestamp so it stays fresh.
function mergeTap(existing: LocalTap[], tap: LocalTap): LocalTap[] {
  const without = existing.filter((t) => t.tagUuid !== tap.tagUuid);
  return [tap, ...without];
}

// ── component ────────────────────────────────────────────────────────────────

interface Props {
  currentTap: LocalTap;
  primaryColor: string;
}

// A floating "Your picks (N)" pill just above the Ask bar (D37). Tapping it opens
// the tray of products tapped this visit; it hides while the chat is open.
export function PicksBar({ currentTap, primaryColor }: Props) {
  const [history, setHistory] = useState<LocalTap[]>([]);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const merged = mergeTap(expireOld(loadHistory()), currentTap);
    saveHistory(merged);
    setHistory(merged);
    setMounted(true);
  }, [currentTap]);

  useEffect(() => {
    const onChat = (e: Event) => setChatOpen(!!(e as CustomEvent<{ open: boolean }>).detail?.open);
    window.addEventListener(CHAT_EVENT, onChat);
    return () => window.removeEventListener(CHAT_EVENT, onChat);
  }, []);

  // Hide until hydrated, until there's more than one product in the trail, and while chatting
  if (!mounted || history.length < 2 || chatOpen) return null;

  return (
    <div style={{ position: "fixed", right: "12px", bottom: "calc(72px + env(safe-area-inset-bottom))", zIndex: 45, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", maxWidth: "calc(100vw - 24px)" }}>
      {open && (
        <div style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "14px", padding: "10px", display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", maxWidth: "100%", boxShadow: "0 6px 20px rgba(0,0,0,0.10)" }}>
          {history.map((t) => {
            const isCurrent = t.tagUuid === currentTap.tagUuid;
            return (
              <a key={t.tagUuid} href={`/p/${t.tagUuid}`} title={t.productTitle} style={{ flexShrink: 0, textDecoration: "none", display: "block" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "8px", overflow: "hidden", border: isCurrent ? `2.5px solid ${primaryColor}` : "2.5px solid transparent", boxSizing: "border-box", background: "#f0f0f0", opacity: isCurrent ? 1 : 0.8 }}>
                  {t.productImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.productImageUrl} alt={t.productTitle} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px 4px 4px", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "999px", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", fontSize: "0.78rem", fontWeight: 600, color: "#333", fontFamily: "inherit", cursor: "pointer" }}>
        <span style={{ width: "26px", height: "26px", borderRadius: "50%", overflow: "hidden", background: "#f0f0f0", display: "block" }}>
          {history[1]?.productImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={history[1].productImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          )}
        </span>
        Your picks ({history.length})
      </button>
    </div>
  );
}
