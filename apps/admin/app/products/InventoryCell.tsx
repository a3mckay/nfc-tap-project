"use client";

import { useState, useTransition } from "react";
import { setInventoryAction } from "./actions.js";

export function InventoryCell({
  productId,
  shop,
  initialQty,
}: {
  productId: string;
  shop: string;
  initialQty: number;
}) {
  const [qty, setQty] = useState(String(initialQty));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleBlur() {
    const n = parseInt(qty, 10);
    if (isNaN(n) || n < 0 || n === initialQty) {
      setQty(String(initialQty));
      return;
    }
    setSaved(false);
    startTransition(async () => {
      await setInventoryAction(shop, productId, n);
      setSaved(true);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <input
        type="number"
        min={0}
        value={qty}
        onChange={(e) => { setQty(e.target.value); setSaved(false); }}
        onBlur={handleBlur}
        disabled={pending}
        style={{
          width: "72px",
          padding: "3px 6px",
          fontSize: "0.82rem",
          border: "1px solid #ddd",
          borderRadius: "4px",
          textAlign: "right",
          opacity: pending ? 0.5 : 1,
        }}
      />
      {saved && <span style={{ fontSize: "0.72rem", color: "#16a34a" }}>✓</span>}
    </div>
  );
}
