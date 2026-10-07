"use client";

// PRD v4 §7 Step 15b: the research fact sheet. Facts the AI research tool found,
// each with its source, which the Shelf-Side AI Assistant answers from. Owners,
// managers and co-managers can correct, add and remove facts; their changes are
// kept when the product is regenerated.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFactAction, addFactAction, deleteFactAction, setBrandWebsiteAction } from "./factActions.js";

export interface FactRow {
  id: string;
  topic: string;
  fact: string;
  source_url: string | null;
  source_kind: string;
  owner_edited: boolean;
}

interface Props {
  shop: string;
  productId: string;
  vendor: string | null;
  brandWebsite: { website: string; confirmed: boolean } | null;
  facts: FactRow[];
}

const TOPICS = ["materials", "care", "fit", "sizing", "origin", "construction", "features", "other"];
const KIND_LABEL: Record<string, string> = { brand: "Brand site", retailer: "Retailer", review: "Review", other: "Web", owner: "Your note" };

const sectionStyle: React.CSSProperties = { borderTop: "1px solid #eee", paddingTop: "1.5rem", marginTop: "2rem" };
const headingStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.35rem" };
const hintStyle: React.CSSProperties = { fontSize: "0.78rem", color: "#888", margin: "0 0 1rem" };
const inputStyle: React.CSSProperties = { padding: "0.4rem 0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.88rem", fontFamily: "inherit" };
const btnStyle: React.CSSProperties = { padding: "4px 10px", fontSize: "0.78rem", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" };
const linkBtnStyle: React.CSSProperties = { background: "none", border: "none", padding: 0, fontSize: "0.75rem", color: "#666", cursor: "pointer", textDecoration: "underline" };
const pillStyle: React.CSSProperties = { fontSize: "0.68rem", padding: "1px 7px", borderRadius: "99px", background: "#f1f5f9", color: "#475569", whiteSpace: "nowrap" };

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function FactSheet({ shop, productId, vendor, brandWebsite, facts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ topic: "materials", fact: "" });
  const [newFact, setNewFact] = useState({ topic: "materials", fact: "" });
  const [site, setSite] = useState(brandWebsite?.website.replace(/^https:\/\//, "") ?? "");
  const [editingSite, setEditingSite] = useState(false);

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) { setError(res.error); return; }
      after?.();
      router.refresh();
    });
  }

  return (
    <section style={sectionStyle} aria-labelledby="fact-sheet-heading">
      <p id="fact-sheet-heading" style={headingStyle}>Fact sheet</p>
      <p style={hintStyle}>
        What the AI assistant answers customer questions from. Generate fills this in from the web, brand site first.
        Your edits and additions are kept when you generate again.
      </p>

      {vendor && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem", fontSize: "0.85rem" }}>
          <span style={{ color: "#444" }}>{vendor} website:</span>
          {editingSite ? (
            <>
              <input style={{ ...inputStyle, width: "220px" }} value={site} onChange={(e) => setSite(e.target.value)}
                placeholder="northfield.com" aria-label={`${vendor} website`} />
              <button type="button" style={btnStyle} disabled={isPending}
                onClick={() => run(() => setBrandWebsiteAction(shop, productId, site), () => setEditingSite(false))}>Save</button>
              <button type="button" style={linkBtnStyle} onClick={() => setEditingSite(false)}>Cancel</button>
            </>
          ) : (
            <>
              {brandWebsite
                ? <a href={brandWebsite.website} target="_blank" rel="noopener noreferrer" style={{ color: "#0369a1" }}>{hostOf(brandWebsite.website)}</a>
                : <span style={{ color: "#92400e" }}>not found. Add it so research starts from the brand&apos;s own site.</span>}
              {brandWebsite && !brandWebsite.confirmed && <span style={{ ...pillStyle, background: "#fef3c7", color: "#92400e" }}>Found automatically — check it</span>}
              <button type="button" style={linkBtnStyle} onClick={() => setEditingSite(true)}>{brandWebsite ? "Change" : "Add website"}</button>
            </>
          )}
        </div>
      )}

      {facts.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#888", margin: "0 0 1rem" }}>No facts yet. Click Generate above to research this product, or add one below.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem", border: "1px solid #eee", borderRadius: "6px" }}>
          {facts.map((f, i) => (
            <li key={f.id} style={{ padding: "0.6rem 0.75rem", borderTop: i ? "1px solid #f1f1f1" : "none", display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
              {editing === f.id ? (
                <div style={{ display: "flex", gap: "0.4rem", flex: 1, flexWrap: "wrap" }}>
                  <select style={inputStyle} value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} aria-label="Topic">
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input style={{ ...inputStyle, flex: 1, minWidth: "200px" }} value={draft.fact} onChange={(e) => setDraft({ ...draft, fact: e.target.value })} aria-label="Fact" />
                  <button type="button" style={btnStyle} disabled={isPending}
                    onClick={() => run(() => updateFactAction(shop, productId, f.id, draft.topic, draft.fact), () => setEditing(null))}>Save</button>
                  <button type="button" style={linkBtnStyle} onClick={() => setEditing(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <span style={{ ...pillStyle, minWidth: "72px", textAlign: "center" }}>{f.topic}</span>
                  <div style={{ flex: 1, fontSize: "0.88rem", color: "#222" }}>
                    {f.fact}
                    <div style={{ fontSize: "0.72rem", color: "#888", marginTop: "2px" }}>
                      {KIND_LABEL[f.source_kind] ?? f.source_kind}
                      {f.source_url && <> · <a href={f.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "#888" }}>{hostOf(f.source_url)}</a></>}
                      {f.owner_edited && f.source_kind !== "owner" && " · edited"}
                    </div>
                  </div>
                  <button type="button" style={linkBtnStyle} onClick={() => { setEditing(f.id); setDraft({ topic: f.topic, fact: f.fact }); }}>Edit</button>
                  <button type="button" style={linkBtnStyle} disabled={isPending}
                    onClick={() => run(() => deleteFactAction(shop, productId, f.id))}>Remove</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <select style={inputStyle} value={newFact.topic} onChange={(e) => setNewFact({ ...newFact, topic: e.target.value })} aria-label="New fact topic">
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input style={{ ...inputStyle, flex: 1, minWidth: "220px" }} value={newFact.fact} placeholder="Runs half a size large"
          onChange={(e) => setNewFact({ ...newFact, fact: e.target.value })} aria-label="New fact" />
        <button type="button" style={btnStyle} disabled={isPending}
          onClick={() => run(() => addFactAction(shop, productId, newFact.topic, newFact.fact), () => setNewFact({ ...newFact, fact: "" }))}>Add fact</button>
      </div>
      {error && <p role="alert" style={{ color: "#c00", fontSize: "0.8rem", marginTop: "0.5rem" }}>{error}</p>}
    </section>
  );
}
