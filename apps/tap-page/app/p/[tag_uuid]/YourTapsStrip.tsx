"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nfc_tap_history_v1";
const MAX_LOCAL = 50;

export interface LocalTap {
  tagUuid: string;
  productTitle: string;
  productImageUrl: string | null;
  productVendor: string | null;
  storeName: string;
  tappedAt: number;
}

interface Props {
  currentTap: LocalTap;
  isAuthenticated: boolean;
  primaryColor: string;
}

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taps.slice(0, MAX_LOCAL)));
  } catch {
    // Quota exceeded or storage disabled — silently drop
  }
}

// Merge a new tap into history: if the same tag is already there, move it to the front
// and update the timestamp; otherwise prepend.
function mergeTap(existing: LocalTap[], tap: LocalTap): LocalTap[] {
  const filtered = existing.filter((t) => t.tagUuid !== tap.tagUuid);
  return [tap, ...filtered];
}

export function YourTapsStrip({ currentTap, isAuthenticated, primaryColor }: Props) {
  const [history, setHistory] = useState<LocalTap[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadHistory();
    const merged = mergeTap(loaded, currentTap);
    saveHistory(merged);
    setHistory(merged);
    setMounted(true);
  }, [currentTap]);

  if (!mounted || history.length < 2) return null; // Need at least one previous tap

  const others = history.filter((t) => t.tagUuid !== currentTap.tagUuid).slice(0, 8);
  if (others.length === 0) return null;

  return (
    <section style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.875rem" }}>
        <h2 style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>
          Your recent taps
        </h2>
        {isAuthenticated && (
          <a href="/me" style={{ fontSize: "0.78rem", color: primaryColor, textDecoration: "none" }}>
            See all →
          </a>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem", marginLeft: "-1rem", paddingLeft: "1rem", marginRight: "-1rem", paddingRight: "1rem" }}>
        {others.map((t) => (
          <a key={t.tagUuid} href={`/p/${t.tagUuid}`}
            style={{ flexShrink: 0, width: "92px", textDecoration: "none", color: "inherit" }}>
            <div style={{
              width: "92px", height: "92px", borderRadius: "8px",
              background: t.productImageUrl ? `url(${t.productImageUrl}) center/cover` : "#f0f0f0",
              marginBottom: "6px",
            }} />
            <p style={{ fontSize: "0.7rem", color: "#444", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {t.productTitle}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
