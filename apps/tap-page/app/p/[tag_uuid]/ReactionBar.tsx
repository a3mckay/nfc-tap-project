"use client";

import { useState, useTransition } from "react";
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

export function ReactionBar({ tagId, sessionId, primaryColor, customerId }: Props) {
  const [selected, setSelected] = useState<Reaction | null>(null);
  const [done, setDone] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleSelect(reaction: Reaction) {
    if (done) return;
    setSelected(reaction);
    startTransition(async () => {
      const counts = await recordReactionAction(tagId, sessionId, reaction, customerId);
      setProof(socialProofMessage(reaction, counts));
      setDone(true);
    });
  }

  return (
    // Under the key points, above Product details (founder, 2026-10-05); the
    // bottom of the screen belongs to the Ask bar and the picks pill (D37).
    <div aria-label="What do you think?">
      {done ? (
        <p style={{ fontSize: "0.85rem", color: "#444", margin: "0.4rem 0", fontWeight: 500, textAlign: "center" }}>
          {proof ?? "Thanks for your feedback"}
        </p>
      ) : (
        <>
          <p style={{ fontSize: "0.72rem", color: "#999", margin: "0 0 0.4rem" }}>What do you think?</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {OPTIONS.map(({ value, label }) => {
              const isSelected = selected === value;
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(value)}
                  style={{
                    flex: 1,
                    padding: "0.55rem 0",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    borderRadius: "999px",
                    border: `1px solid ${isSelected ? primaryColor : "#ddd"}`,
                    background: isSelected ? primaryColor : "#fff",
                    color: isSelected ? "#fff" : "#333",
                    cursor: "pointer",
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
