"use client";

import { useState, useTransition } from "react";
import type { StorePlatform } from "@nfc/db";
import { setPlatformAction } from "./actions.js";

interface Props {
  shop: string;
  initialPlatform: StorePlatform;
}

const OPTIONS: { value: StorePlatform; label: string; note: string }[] = [
  { value: "shopify",     label: "Shopify",     note: "Auto-sync products, inventory, reviews and discounts" },
  { value: "woocommerce", label: "WooCommerce", note: "Manual product import + manual inventory" },
  { value: "squarespace", label: "Squarespace", note: "Manual product import + manual inventory" },
  { value: "other",       label: "Other / no platform", note: "Manual product entry only" },
];

export function PlatformPicker({ shop, initialPlatform }: Props) {
  const [platform, setPlatform] = useState<StorePlatform>(initialPlatform);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function handleChange(next: StorePlatform) {
    setPlatform(next);
    setSavedAt(null);
    startTransition(async () => {
      await setPlatformAction(shop, next);
      setSavedAt(Date.now());
    });
  }

  return (
    <div>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {OPTIONS.map((opt) => (
          <label key={opt.value} style={{
            display: "flex", gap: "0.625rem", padding: "0.75rem 0.875rem",
            border: `1px solid ${platform === opt.value ? "#111" : "#ddd"}`,
            borderRadius: "6px", cursor: "pointer", background: platform === opt.value ? "#fafafa" : "#fff",
          }}>
            <input type="radio" name="platform" value={opt.value} checked={platform === opt.value}
              onChange={() => handleChange(opt.value)} disabled={pending}
              style={{ marginTop: "2px" }} />
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111" }}>{opt.label}</p>
              <p style={{ fontSize: "0.78rem", color: "#666", marginTop: "2px" }}>{opt.note}</p>
            </div>
          </label>
        ))}
      </div>
      {savedAt && (
        <p style={{ fontSize: "0.78rem", color: "#166534", marginTop: "0.5rem" }}>Platform saved ✓</p>
      )}
    </div>
  );
}
