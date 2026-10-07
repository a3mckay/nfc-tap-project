"use client";

import { useState, useTransition } from "react";
import { saveTrainingAction, draftTrainingAction } from "./trainingActions.js";
import { fillEmptyFromDraft, MAX_COMMON_QUESTIONS, type TrainingFormData } from "@/training-utils.js";
import type { CategoryCopy } from "@nfc/db";

// Staff Training section (PRD v4 §7 Step 13e). Only staff see these notes.

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px", marginBottom: "1.25rem" };
const labelStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em" };
const hintStyle: React.CSSProperties = { fontSize: "0.75rem", color: "#888", lineHeight: 1.45 };
const inputStyle: React.CSSProperties = { padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.95rem", fontFamily: "inherit" };
const taStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", minHeight: "64px" };
const smallBtn: React.CSSProperties = { padding: "4px 12px", fontSize: "0.8rem", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" };

type TextKey = Exclude<keyof TrainingFormData, "worth_the_price" | "common_questions">;

type TextField = { key: TextKey; label: string; hint: string; placeholder: string; multiline?: boolean };

// Labels and examples in the product's category's words (docs/category-labels.md).
function textFields(c: CategoryCopy["training"]): { first: TextField[]; after: TextField[]; last: TextField[] } {
  return {
    first: [
      { key: "one_line_sell", label: "The one-line sell", hint: "The sentence an associate says when a customer picks this up. How you'd actually say it — not marketing copy.", placeholder: c.oneLineSellExample },
      { key: "who_its_for", label: "Who it's for", hint: "2–3 customer profiles it genuinely suits.", placeholder: c.whoItsForExample },
      { key: "who_its_not_for", label: "Who it's not for", hint: "Volunteering a limitation builds trust and closes more sales than overselling.", placeholder: c.whoItsNotForExample },
      { key: "fit_and_sizing", label: c.truth.label, hint: c.truth.hint, placeholder: c.truth.example },
    ],
    after: [
      { key: "closest_alternative", label: "Closest alternative in the store", hint: "Helps associates handle the undecided customer.", placeholder: c.closestAlternativeExample },
    ],
    last: [
      { key: "companion_products", label: "Upsell and companion products", hint: "What pairs naturally with this.", placeholder: c.companionExample },
      { key: "brand_context", label: "Brand context", hint: "Why you carry this brand and what sets it apart from a chain store.", placeholder: c.brandExample, multiline: true },
    ],
  };
}

interface Props {
  shop: string;
  productId: string;
  initial: TrainingFormData;
  stockNoteUpdatedAt: string | null;
  aiAvailable: boolean;
  trainingCopy: CategoryCopy["training"];
}

export function TrainingForm({ shop, productId, initial, stockNoteUpdatedAt, aiAvailable, trainingCopy }: Props) {
  const fields = textFields(trainingCopy);
  const [form, setForm] = useState<TrainingFormData>(initial);
  const [pending, startTransition] = useTransition();
  const [drafting, setDrafting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof TrainingFormData>(key: K, value: TrainingFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function save() {
    setMessage(null);
    startTransition(async () => {
      const r = await saveTrainingAction(shop, productId, form);
      setMessage(r.error ? { kind: "error", text: r.error } : { kind: "ok", text: "Staff training notes saved." });
    });
  }

  function draft() {
    setMessage(null);
    setDrafting(true);
    startTransition(async () => {
      const r = await draftTrainingAction(shop, productId);
      setDrafting(false);
      if (r.error || !r.draft) { setMessage({ kind: "error", text: r.error ?? "AI draft failed" }); return; }
      setForm((f) => fillEmptyFromDraft(f, r.draft!));
      setMessage({ kind: "ok", text: "Draft added to the empty fields. Review and edit it, then save." });
    });
  }

  const renderText = ({ key, label, hint, placeholder, multiline }: TextField) => (
    <div key={key} style={fieldStyle}>
      <label style={labelStyle} htmlFor={`training-${key}`}>{label}</label>
      <span style={hintStyle}>{hint}</span>
      <textarea id={`training-${key}`} style={{ ...taStyle, minHeight: multiline ? "96px" : "56px" }}
        value={form[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <p style={{ ...hintStyle, fontSize: "0.9rem", margin: 0, color: "#555" }}>
          Only your staff see this, when they tap the product. Every field is optional.
        </p>
        {aiAvailable && (
          <button type="button" onClick={draft} disabled={pending} style={{ ...smallBtn, padding: "0.45rem 0.9rem" }}>
            {drafting ? "Drafting…" : "Draft with AI (optional)"}
          </button>
        )}
      </div>

      {fields.first.map(renderText)}

      <div style={fieldStyle}>
        <span style={labelStyle}>Why it's worth the price</span>
        <span style={hintStyle}>2–3 specific reasons. Prepares associates for "it's expensive".</span>
        {form.worth_the_price.map((reason, i) => (
          <input key={i} style={inputStyle} value={reason} aria-label={`Reason ${i + 1}`}
            placeholder={trainingCopy.worthExample[i] ?? ""}
            onChange={(e) => set("worth_the_price", form.worth_the_price.map((r, j) => (j === i ? e.target.value : r)))} />
        ))}
      </div>

      {fields.after.map(renderText)}

      <div style={fieldStyle}>
        <span style={labelStyle}>Common questions and answers</span>
        <span style={hintStyle}>3–5 questions you hear constantly about this product, with your answer.</span>
        {form.common_questions.map((q, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "0.6rem", border: "1px solid #eee", borderRadius: "4px" }}>
            <input style={inputStyle} value={q.question} placeholder={trainingCopy.questionExample.question} aria-label={`Question ${i + 1}`}
              onChange={(e) => set("common_questions", form.common_questions.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
            <textarea style={{ ...taStyle, minHeight: "48px" }} value={q.answer} placeholder={trainingCopy.questionExample.answer} aria-label={`Answer ${i + 1}`}
              onChange={(e) => set("common_questions", form.common_questions.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
            <button type="button" style={{ ...smallBtn, alignSelf: "flex-start", background: "none", color: "#999" }}
              onClick={() => set("common_questions", form.common_questions.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        {form.common_questions.length < MAX_COMMON_QUESTIONS && (
          <button type="button" style={{ ...smallBtn, alignSelf: "flex-start" }}
            onClick={() => set("common_questions", [...form.common_questions, { question: "", answer: "" }])}>+ Add question</button>
        )}
      </div>

      {fields.last.map(renderText)}

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="training-stock_note">Current stock note</label>
        <span style={hintStyle}>
          Sizes running low, what's coming in, what's display-only. Update it as things change.
          {stockNoteUpdatedAt && ` Last updated ${new Date(stockNoteUpdatedAt).toLocaleDateString()}.`}
        </span>
        <textarea id="training-stock_note" style={{ ...taStyle, minHeight: "56px" }} value={form.stock_note}
          placeholder={trainingCopy.stockNoteExample}
          onChange={(e) => set("stock_note", e.target.value)} />
      </div>

      {message && (
        <p style={{ fontSize: "0.85rem", color: message.kind === "ok" ? "#166534" : "#c00", marginBottom: "0.75rem" }}>{message.text}</p>
      )}
      <button type="button" onClick={save} disabled={pending}
        style={{ padding: "0.6rem 1.25rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.9rem", fontWeight: 600, cursor: pending ? "default" : "pointer" }}>
        {pending && !drafting ? "Saving…" : "Save staff training"}
      </button>
    </section>
  );
}
