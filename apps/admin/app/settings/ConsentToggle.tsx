"use client";

import { useState, useTransition } from "react";
import { setConsentAction } from "./actions.js";

interface Props {
  shop: string;
  initialOptedIn: boolean;
}

export function ConsentToggle({ shop, initialOptedIn }: Props) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setOptedIn(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await setConsentAction(shop, next);
      if (result.error) {
        setError(result.error);
        setOptedIn(!next);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
        <button
          onClick={() => handleChange(!optedIn)}
          disabled={isPending}
          style={{
            width: "48px",
            height: "26px",
            borderRadius: "13px",
            border: "none",
            background: optedIn ? "#166534" : "#d1d5db",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
            opacity: isPending ? 0.6 : 1,
          }}
          aria-checked={optedIn}
          role="switch"
        >
          <span style={{
            position: "absolute",
            top: "3px",
            left: optedIn ? "25px" : "3px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
          }} />
        </button>
        <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
          {optedIn ? "Opted in — contributing to network insights" : "Opted out — data stays private"}
        </span>
        {saved && <span style={{ fontSize: "0.8rem", color: "#166534" }}>Saved ✓</span>}
      </div>
      {error && <p style={{ color: "#c00", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}
