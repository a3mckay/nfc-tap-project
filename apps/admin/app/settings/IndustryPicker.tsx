"use client";

// PRD v4 §7 Step 15l: the store's main industry, the fallback spec category (D51).
import { useState, useTransition } from "react";
import { setIndustryAction } from "./actions.js";

// `names` comes from CATEGORY_NAMES (this runs in the browser, so it can't import @nfc/db).
export function IndustryPicker({ shop, initial, names }: { shop: string; initial: string; names: Record<string, string> }) {
  const options: Array<[string, string]> = [["", "Mixed / not set"], ...Object.entries(names).filter(([c]) => c !== "general")];
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
        {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      {status && <span style={{ fontSize: "0.82rem", color: status === "Saved" ? "#15803d" : "#c00" }}>{status}</span>}
    </div>
  );
}
