"use client";

import { useState, useTransition } from "react";
import { saveEnrichmentAction, type EnrichmentFormData } from "./actions.js";
import type { Review, FaqItem } from "@nfc/db";

interface Props {
  initial: EnrichmentFormData;
  productTitle: string;
  isAiGenerated: boolean;
}

function AiBadge() {
  return (
    <span style={{ padding: "1px 6px", borderRadius: "99px", fontSize: "0.65rem", fontWeight: 700, color: "#0369a1", background: "#e0f2fe", letterSpacing: "0.03em" }}>
      AI
    </span>
  );
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px", marginBottom: "1.25rem" };
const labelStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.95rem", fontFamily: "inherit" };
const taStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", minHeight: "80px" };
const hintStyle: React.CSSProperties = { fontSize: "0.75rem", color: "#888" };
const sectionStyle: React.CSSProperties = { borderTop: "1px solid #eee", paddingTop: "1.5rem", marginTop: "1.5rem" };
const sectionHeadingStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1rem" };
const addBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: "0.8rem", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" };
const removeBtnStyle: React.CSSProperties = { padding: "2px 8px", fontSize: "0.75rem", background: "none", border: "1px solid #eee", borderRadius: "4px", cursor: "pointer", color: "#999", flexShrink: 0 };

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: n <= value ? "#f59e0b" : "#ddd", padding: 0 }}>
          ★
        </button>
      ))}
    </div>
  );
}

const AI_FIELDS = new Set(["backstory", "materials", "fit_notes", "reasons_to_buy_text"]);

export function EnrichmentForm({ initial, productTitle, isAiGenerated }: Props) {
  const [form, setForm] = useState<EnrichmentFormData>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [aiTouched, setAiTouched] = useState<Set<string>>(new Set());

  function set<K extends keyof EnrichmentFormData>(key: K, value: EnrichmentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    if (AI_FIELDS.has(key as string)) {
      setAiTouched((prev) => new Set([...prev, key as string]));
    }
  }

  function showAiBadge(field: string) {
    return isAiGenerated && AI_FIELDS.has(field) && !aiTouched.has(field);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveEnrichmentAction(form);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  // Reviews
  function addReview() {
    set("reviews", [...form.reviews, { author: "", text: "", rating: 5, source: "" }]);
  }
  function updateReview(i: number, patch: Partial<Review>) {
    const updated = form.reviews.map((r, idx) => idx === i ? { ...r, ...patch } : r);
    set("reviews", updated);
  }
  function removeReview(i: number) {
    set("reviews", form.reviews.filter((_, idx) => idx !== i));
  }

  // FAQ
  function addFaq() {
    set("faq", [...form.faq, { question: "", answer: "" }]);
  }
  function updateFaq(i: number, patch: Partial<FaqItem>) {
    const updated = form.faq.map((f, idx) => idx === i ? { ...f, ...patch } : f);
    set("faq", updated);
  }
  function removeFaq(i: number) {
    set("faq", form.faq.filter((_, idx) => idx !== i));
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "660px" }}>
      <p style={{ marginBottom: "1.5rem", fontSize: "0.85rem" }}>
        <strong>{productTitle}</strong>
      </p>

      {/* Product Story */}
      <p style={sectionHeadingStyle}>Product Story</p>

      <div style={fieldStyle}>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          Backstory
          {showAiBadge("backstory") && <AiBadge />}
        </label>
        <textarea style={taStyle} value={form.backstory}
          onChange={(e) => set("backstory", e.target.value)}
          placeholder="Brand origin or product design story…" />
      </div>

      <div style={fieldStyle}>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          Materials & Construction
          {showAiBadge("materials") && <AiBadge />}
        </label>
        <textarea style={{ ...taStyle, minHeight: "60px" }} value={form.materials}
          onChange={(e) => set("materials", e.target.value)}
          placeholder="Key materials, fabric weight, construction details…" />
      </div>

      <div style={fieldStyle}>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          Fit & Feel
          {showAiBadge("fit_notes") && <AiBadge />}
        </label>
        <textarea style={{ ...taStyle, minHeight: "60px" }} value={form.fit_notes}
          onChange={(e) => set("fit_notes", e.target.value)}
          placeholder="Sizing, fit, or how to wear it…" />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Care Instructions</label>
        <textarea style={{ ...taStyle, minHeight: "60px" }} value={form.care_instructions}
          onChange={(e) => set("care_instructions", e.target.value)}
          placeholder="Machine wash cold, lay flat to dry…" />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Sustainability</label>
        <textarea style={{ ...taStyle, minHeight: "60px" }} value={form.sustainability_notes}
          onChange={(e) => set("sustainability_notes", e.target.value)}
          placeholder="Certified organic cotton, carbon-neutral shipping, made in Portugal…" />
      </div>

      {/* Why Buy */}
      <div style={sectionStyle}>
        <p style={sectionHeadingStyle}>Why Buy</p>
        <div style={fieldStyle}>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            Reasons to buy
            {showAiBadge("reasons_to_buy_text") && <AiBadge />}
          </label>
          <span style={hintStyle}>One reason per line (2–4 recommended)</span>
          <textarea style={taStyle} value={form.reasons_to_buy_text}
            onChange={(e) => set("reasons_to_buy_text", e.target.value)}
            placeholder={"Ethically sourced merino\nWarm yet breathable\nLifetime repair guarantee"} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Awards & Press</label>
          <span style={hintStyle}>One per line — certifications, press mentions, awards</span>
          <textarea style={{ ...taStyle, minHeight: "60px" }} value={form.awards_text}
            onChange={(e) => set("awards_text", e.target.value)}
            placeholder={"B Corp Certified\nAs seen in Vogue, March 2024\nSustainable Apparel Coalition member"} />
        </div>
      </div>

      {/* Media */}
      <div style={sectionStyle}>
        <p style={sectionHeadingStyle}>Media</p>
        <div style={fieldStyle}>
          <label style={labelStyle}>Video</label>
          <span style={hintStyle}>YouTube or Vimeo URL — shown as an embedded player on the microsite</span>
          <input style={inputStyle} type="url" value={form.video_url}
            onChange={(e) => set("video_url", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Extra image URLs</label>
          <span style={hintStyle}>One URL per line — detail shots, lifestyle images, packaging</span>
          <textarea style={taStyle} value={form.extra_images_text}
            onChange={(e) => set("extra_images_text", e.target.value)}
            placeholder={"https://cdn.example.com/detail-1.jpg\nhttps://cdn.example.com/lifestyle.jpg"} />
        </div>
      </div>

      {/* Customer Reviews */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <p style={{ ...sectionHeadingStyle, marginBottom: 0 }}>Customer Reviews</p>
          <button type="button" onClick={addReview} style={addBtnStyle}>+ Add review</button>
        </div>
        {form.reviews.length === 0 && (
          <p style={{ ...hintStyle, marginBottom: "0.5rem" }}>No reviews added yet. Add quotes from happy customers to show on the microsite.</p>
        )}
        {form.reviews.map((r, i) => (
          <div key={i} style={{ border: "1px solid #eee", borderRadius: "6px", padding: "1rem", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <StarRating value={r.rating} onChange={(v) => updateReview(i, { rating: v })} />
              <button type="button" onClick={() => removeReview(i)} style={removeBtnStyle}>Remove</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Customer name</label>
                <input style={inputStyle} value={r.author} onChange={(e) => updateReview(i, { author: e.target.value })} placeholder="Sarah M." />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Source</label>
                <input style={inputStyle} value={r.source} onChange={(e) => updateReview(i, { source: e.target.value })} placeholder="In-store, Google, Shopify…" />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Review text</label>
              <textarea style={{ ...taStyle, minHeight: "60px" }} value={r.text}
                onChange={(e) => updateReview(i, { text: e.target.value })}
                placeholder="Exactly what I was looking for. The quality is outstanding…" />
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <p style={{ ...sectionHeadingStyle, marginBottom: 0 }}>FAQ</p>
          <button type="button" onClick={addFaq} style={addBtnStyle}>+ Add question</button>
        </div>
        {form.faq.length === 0 && (
          <p style={{ ...hintStyle, marginBottom: "0.5rem" }}>Common questions customers ask in store — shown as an expandable list on the microsite.</p>
        )}
        {form.faq.map((f, i) => (
          <div key={i} style={{ border: "1px solid #eee", borderRadius: "6px", padding: "1rem", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
              <button type="button" onClick={() => removeFaq(i)} style={removeBtnStyle}>Remove</button>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Question</label>
              <input style={inputStyle} value={f.question} onChange={(e) => updateFaq(i, { question: e.target.value })}
                placeholder="Is this suitable for cold weather?" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Answer</label>
              <textarea style={{ ...taStyle, minHeight: "60px" }} value={f.answer}
                onChange={(e) => updateFaq(i, { answer: e.target.value })}
                placeholder="Yes — the merino wool retains warmth even when damp…" />
            </div>
          </div>
        ))}
      </div>

      {/* Staff */}
      <div style={sectionStyle}>
        <p style={sectionHeadingStyle}>Staff Perspective</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Staff quote</label>
            <textarea style={{ ...taStyle, minHeight: "60px" }} value={form.staff_quote}
              onChange={(e) => set("staff_quote", e.target.value)}
              placeholder='"This is my go-to piece every winter."' />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Staff name & role</label>
            <input style={inputStyle} value={form.staff_name}
              onChange={(e) => set("staff_name", e.target.value)}
              placeholder="Alex, Senior Stylist" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem", alignItems: "center", marginBottom: "1.25rem" }}>
          {form.staff_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.staff_photo_url} alt="Staff" style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "1px solid #eee" }} />
          )}
          <div style={fieldStyle}>
            <label style={labelStyle}>Staff photo URL</label>
            <input style={inputStyle} value={form.staff_photo_url}
              onChange={(e) => set("staff_photo_url", e.target.value)}
              placeholder="https://… (round avatar shown beside the quote)" />
          </div>
        </div>
      </div>

      {/* Internal */}
      <div style={sectionStyle}>
        <p style={sectionHeadingStyle}>Internal Notes</p>
        <div style={fieldStyle}>
          <span style={hintStyle}>Not shown to customers</span>
          <textarea style={{ ...taStyle, minHeight: "60px" }} value={form.internal_staff_notes}
            onChange={(e) => set("internal_staff_notes", e.target.value)}
            placeholder="Fragile clasp — handle with care when demonstrating…" />
        </div>
      </div>

      {error && <p style={{ color: "#c00", margin: "1rem 0", fontSize: "0.9rem" }}>{error}</p>}

      <div style={{ marginTop: "1.5rem" }}>
        <button type="submit" disabled={isPending}
          style={{ padding: "0.6rem 1.25rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.6 : 1 }}>
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save details"}
        </button>
      </div>
    </form>
  );
}
