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
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      borderTop: "1px solid #eee",
      background: "#fff",
      padding: "0.875rem 1rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.75rem",
      zIndex: 50,
    }}>
      {done ? (
        <p style={{ fontSize: "0.85rem", color: "#444", margin: 0, fontWeight: 500 }}>
          {proof ?? "Thanks for your feedback"}
        </p>
      ) : (
        <>
          <span style={{ fontSize: "0.75rem", color: "#aaa", marginRight: "0.25rem" }}>
            What do you think?
          </span>
          {OPTIONS.map(({ value, label }) => {
            const isSelected = selected === value;
            return (
              <button
                key={value}
                onClick={() => handleSelect(value)}
                style={{
                  padding: "0.4rem 1.1rem",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  borderRadius: "999px",
                  border: `1px solid ${isSelected ? primaryColor : "#ddd"}`,
                  background: isSelected ? primaryColor : "transparent",
                  color: isSelected ? "#fff" : "#444",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
