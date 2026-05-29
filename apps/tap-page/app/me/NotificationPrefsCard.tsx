"use client";

import { useState, useTransition } from "react";
import { saveNotificationPrefsAction } from "./actions.js";
import type { NotificationPrefs } from "@nfc/db";

type PrefsState = Omit<NotificationPrefs, "customer_id">;

interface Props {
  initialPrefs: PrefsState;
}

const NOTIFICATION_TYPES = [
  {
    key: "sale" as const,
    label: "Sale alerts",
    description: "Price drops and promotions",
    fields: {
      loved:  "sale_for_loved"  as const,
      liked:  "sale_for_liked"  as const,
      tapped: "sale_for_tapped" as const,
    },
  },
  {
    key: "offer" as const,
    label: "Exclusive offers",
    description: "Discount codes sent just to you",
    fields: {
      loved:  "offer_for_loved"  as const,
      liked:  "offer_for_liked"  as const,
      tapped: "offer_for_tapped" as const,
    },
  },
  {
    key: "restock" as const,
    label: "Restock alerts",
    description: "When a sold-out item is back",
    fields: {
      loved:  "restock_for_loved"  as const,
      liked:  "restock_for_liked"  as const,
      tapped: "restock_for_tapped" as const,
    },
  },
] as const;

const ENGAGEMENT_LEVELS = [
  { key: "loved" as const,  label: "Items I ❤️ loved"  },
  { key: "liked" as const,  label: "Items I 👍 liked"  },
  { key: "tapped" as const, label: "Items I tapped"    },
] as const;

export function NotificationPrefsCard({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<PrefsState>(initialPrefs);
  const [savedKey, setSavedKey]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(field: keyof PrefsState) {
    const next = { ...prefs, [field]: !prefs[field] };
    setPrefs(next);
    setSavedKey(null);

    startTransition(async () => {
      await saveNotificationPrefsAction({ [field]: next[field] });
      setSavedKey(field);
      setTimeout(() => setSavedKey(null), 2000);
    });
  }

  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <p style={{
        fontSize: "0.7rem", fontWeight: 700, color: "#aaa",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem",
      }}>
        Notification preferences
      </p>
      <p style={{ fontSize: "0.78rem", color: "#888", marginBottom: "1rem", lineHeight: 1.4 }}>
        Choose which products trigger each type of notification.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {NOTIFICATION_TYPES.map((type) => (
          <div
            key={type.key}
            style={{
              border: "1px solid #eee",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {/* Type header */}
            <div style={{
              padding: "0.65rem 1rem",
              background: "#f9f9f9",
              borderBottom: "1px solid #eee",
            }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#222", margin: 0 }}>
                {type.label}
              </p>
              <p style={{ fontSize: "0.72rem", color: "#888", margin: "0.1rem 0 0" }}>
                {type.description}
              </p>
            </div>

            {/* Engagement level toggles */}
            <div>
              {ENGAGEMENT_LEVELS.map((level, idx) => {
                const field = type.fields[level.key];
                const isOn  = prefs[field];
                const isSaved = savedKey === field;

                return (
                  <div
                    key={level.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 1rem",
                      borderTop: idx === 0 ? "none" : "1px solid #f5f5f5",
                    }}
                  >
                    <span style={{ fontSize: "0.82rem", color: "#444" }}>
                      {level.label}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {isSaved && (
                        <span style={{ fontSize: "0.7rem", color: "#166534" }}>✓</span>
                      )}
                      <button
                        role="switch"
                        aria-checked={isOn}
                        onClick={() => toggle(field)}
                        disabled={isPending}
                        style={{
                          width: "42px",
                          height: "24px",
                          borderRadius: "999px",
                          border: "none",
                          background: isOn ? "#111" : "#ddd",
                          position: "relative",
                          cursor: isPending ? "not-allowed" : "pointer",
                          transition: "background 0.2s",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{
                          position: "absolute",
                          top: "3px",
                          left: isOn ? "21px" : "3px",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          background: "#fff",
                          transition: "left 0.2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: "0.7rem", color: "#ccc", marginTop: "0.75rem", lineHeight: 1.4 }}>
        Changes are saved automatically. Stores can only contact you about products you&apos;ve tapped.
      </p>
    </section>
  );
}
