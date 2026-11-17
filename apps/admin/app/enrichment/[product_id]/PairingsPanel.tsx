"use client";

import { useState, useTransition } from "react";
import type { Pairing } from "@nfc/db";
import { removePairingAction, findPairingsAction } from "./pairingActions.js";

// "Goes great with" (founder, 2026-11-16): up to three of the store's products
// the AI picked from the fact sheet. Shown on the customer page and used by the
// assistant only when a customer asks what goes with it.
interface Props {
  shop: string;
  productId: string;
  pairings: Pairing[];
  allowed: boolean;   // false for cannabis and alcohol
}

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };
const SOURCE: Record<string, string> = { owner: "your note", brand: "brand site", reference: "reference" };

export function PairingsPanel({ shop, productId, pairings, allowed }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => { setError((await fn()).error ?? null); });

  return (
    <section style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid #eee" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.35rem" }}>Goes great with</h2>
      {!allowed ? (
        <p style={{ fontSize: "0.85rem", color: "#888" }}>Not shown for cannabis and alcohol: promotion rules don&apos;t allow suggesting more to buy.</p>
      ) : (<>
        <p style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.5, marginBottom: "0.9rem" }}>
          Up to three of your products this one needs, picked by the AI from the fact sheet below. Customers see them on the
          product page; the assistant only mentions them when someone asks what goes with it. Remove one and it stays off.
        </p>
        {pairings.length === 0 && (
          <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.75rem" }}>
            None yet. Generate (or Find again) picks them once the fact sheet has facts and your catalog has something this product needs.
          </p>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {pairings.map((p) => (
            <li key={p.product_id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.6rem 0", borderBottom: "1px solid #f3f3f3" }}>
              <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 6, background: p.image_url ? `url(${p.image_url}) center/cover` : "#f0f0f0" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>{p.title}</p>
                <p style={{ fontSize: "0.82rem", color: "#555", margin: "2px 0" }}>{p.reason}</p>
                <p style={{ fontSize: "0.75rem", color: "#999" }}>
                  Source: {p.source_url ? <a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "#999" }}>{hostOf(p.source_url)}</a> : SOURCE[p.source_kind] ?? p.source_kind}
                  {!p.tag_uuid && " · no active tag, so customers can't tap through to it"}
                </p>
              </div>
              <button type="button" disabled={pending} onClick={() => run(() => removePairingAction(shop, productId, p.product_id))}
                style={{ fontSize: "0.8rem", color: "#c00", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
            </li>
          ))}
        </ul>
        <button type="button" disabled={pending} onClick={() => run(() => findPairingsAction(shop, productId))}
          style={{ marginTop: "0.75rem", padding: "0.35rem 0.8rem", fontSize: "0.82rem", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: pending ? "wait" : "pointer" }}>
          {pending ? "Working…" : "Find again"}
        </button>
      </>)}
      {error && <p role="alert" style={{ fontSize: "0.8rem", color: "#c00", marginTop: "0.5rem" }}>{error}</p>}
    </section>
  );
}
