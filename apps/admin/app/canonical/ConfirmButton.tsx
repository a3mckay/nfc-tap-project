"use client";

import { useTransition } from "react";
import { reviewMatchAction } from "./actions.js";

export function ConfirmButton({ mapId }: { mapId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await reviewMatchAction(mapId); })}
      style={{
        padding: "2px 10px",
        fontSize: "0.78rem",
        fontWeight: 600,
        background: "#111",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {isPending ? "…" : "Confirm"}
    </button>
  );
}
