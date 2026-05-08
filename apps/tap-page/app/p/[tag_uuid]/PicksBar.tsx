"use client";

import { useEffect, useState } from "react";

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

export function PicksBar({ currentTap, primaryColor }: Props) {
  const [history, setHistory] = useState<LocalTap[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const merged = mergeTap(expireOld(loadHistory()), currentTap);
    saveHistory(merged);
    setHistory(merged);
    setMounted(true);
  }, [currentTap]);

  // Hide until hydrated and until there's more than one product in the trail
  if (!mounted || history.length < 2) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "60px", // sits above the ReactionBar
        left: 0,
        right: 0,
        zIndex: 45,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {/* Label — stays pinned left, never scrolls */}
      <div style={{ flexShrink: 0 }}>
        <p style={{
          fontSize: "0.6rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#aaa",
          margin: 0,
          lineHeight: 1,
          marginBottom: "2px",
        }}>
          Your picks
        </p>
        <p style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "#444",
          margin: 0,
          lineHeight: 1,
        }}>
          {history.length} item{history.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "36px", background: "#eee", flexShrink: 0 }} />

      {/* Scrollable thumbnail row */}
      <div style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        flexGrow: 1,
      }}>
        {history.map((t) => {
          const isCurrent = t.tagUuid === currentTap.tagUuid;
          return (
            <a
              key={t.tagUuid}
              href={`/p/${t.tagUuid}`}
              title={t.productTitle}
              style={{ flexShrink: 0, textDecoration: "none", display: "block" }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "7px",
                  backgroundImage: t.productImageUrl ? `url(${t.productImageUrl})` : undefined,
                  backgroundColor: t.productImageUrl ? undefined : "#f0f0f0",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: isCurrent
                    ? `2.5px solid ${primaryColor}`
                    : "2.5px solid transparent",
                  boxSizing: "border-box",
                  outline: isCurrent ? `1px solid ${primaryColor}20` : "none",
                  opacity: isCurrent ? 1 : 0.72,
                  transition: "opacity 0.15s",
                }}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
