"use client";

// PRD v4 §7 Step 15l: the store's main industry, the fallback spec category (D51).
import { useState, useTransition } from "react";
import { setIndustryAction } from "./actions.js";

const OPTIONS: Array<[string, string]> = [
  ["", "Mixed / not set"], ["apparel", "Apparel"], ["footwear", "Footwear"], ["eyewear", "Eyewear"],
  ["home", "Home"], ["wine", "Wine"], ["beer", "Beer"], ["spirits", "Spirits"], ["cannabis", "Cannabis"],
];

export function IndustryPicker({ shop, initial }: { shop: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
      <select value={value} disabled={isPending} aria-label="Main industry"
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          startTransition(async () => {
            const res = await setIndustryAction(shop, next);
            setStatus(res.error ?? "Saved");
          });
        }}
        style={{ padding: "0.45rem 0.6rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.9rem", fontFamily: "inherit" }}>
        {OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      {status && <span style={{ fontSize: "0.82rem", color: status === "Saved" ? "#15803d" : "#c00" }}>{status}</span>}
    </div>
  );
}
