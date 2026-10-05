"use client";

import { useEffect, useState, useTransition } from "react";
import { recordReactionAction, type ReactionResult } from "./actions.js";
import type { Reaction } from "@nfc/db";

interface Props {
  tagId: string;
  sessionId: string;
  primaryColor: string;
  customerId: string | null;
}

const OPTIONS: { value: Reaction; label: string }[] = [
  { value: "passed", label: "Pass" },
  { value: "liked",  label: "Like" },
  { value: "loved",  label: "Love" },
];

function socialProofMessage(reaction: Reaction, counts: ReactionResult): string | null {
  const n = counts[reaction];
  if (n <= 0) return reaction === "loved" ? "You're the first to love this" : null;
  if (reaction === "loved")  return `You and ${n} other${n === 1 ? "" : "s"} loved this`;
  if (reaction === "liked")  return `You and ${n} other${n === 1 ? "" : "s"} liked this`;
  return null; // passes don't get social proof
}

// After a reaction, the thank-you message shows briefly, then dissolves into the
// three buttons with the shopper's choice filled in (founder, 2026-10-05).
export const MESSAGE_MS = 2500;
const FADE_MS = 500;

type Phase = "choose" | "message" | "fading" | "settled";

export function ReactionBar({ tagId, sessionId, primaryColor, customerId }: Props) {
  const [selected, setSelected] = useState<Reaction | null>(null);
  const [phase, setPhase] = useState<Phase>("choose");
  const [proof, setProof] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (phase === "message") {
      const t = setTimeout(() => setPhase("fading"), MESSAGE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "fading") {
      const t = setTimeout(() => setPhase("settled"), FADE_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function handleSelect(reaction: Reaction) {
    if (phase !== "choose") return;
    setSelected(reaction);
    startTransition(async () => {
      const counts = await recordReactionAction(tagId, sessionId, reaction, customerId);
      setProof(socialProofMessage(reaction, counts));
      setPhase("message");
    });
  }

  const showMessage = phase === "message" || phase === "fading";

  return (
    // Under the key points, above Product details (founder, 2026-10-05); the
    // bottom of the screen belongs to the Ask bar and the picks pill (D37).
    <div aria-label="What do you think?" aria-live="polite">
      {showMessage ? (
        <p style={{ fontSize: "0.88rem", color: "#444", margin: 0, minHeight: "3.05rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500, opacity: phase === "fading" ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}>
          {proof ?? "Thanks for your feedback"}
        </p>
      ) : (
        <>
          <p style={{ fontSize: "0.72rem", color: "#999", margin: "0 0 0.4rem" }}>{phase === "settled" ? "Your pick" : "What do you think?"}</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {OPTIONS.map(({ value, label }) => {
              const isSelected = selected === value;
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(value)}
                  disabled={phase !== "choose"}
                  aria-pressed={isSelected}
                  style={{
                    flex: 1,
                    padding: "0.55rem 0",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    borderRadius: "999px",
                    border: `1px solid ${isSelected ? primaryColor : "#ddd"}`,
                    background: isSelected ? primaryColor : "#fff",
                    color: isSelected ? "#fff" : phase === "settled" ? "#aaa" : "#333",
                    cursor: phase === "choose" ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
