"use client";

// PRD v4 §7 Step 15g: a product's questions. Grouped themes by default, with a
// Verbatim toggle and an Unanswered filter (D8). Answers go into the hidden
// answer pool for future questions (D12, D38); promoting them to the product
// page or training Q&A is a separate, explicit step.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerAction, dismissQuestionAction, retireAnswerAction, promoteAction } from "../actions.js";

interface Theme { id: string | null; label: string; store_theme: string | null; count: number; unanswered: number; latest_answer: string | null; last_asked: string }
interface Question { id: string; question_text: string; answer_text: string | null; status: string; asked_by: "customer" | "staff"; staff_name: string | null; pii_removed: string[]; theme_id: string | null; theme_label: string | null; created_at: string }
interface Answer { id: string; scope: "product" | "store"; question: string; answer: string }

interface Props { shop: string; productId: string; themes: Theme[]; questions: Question[]; answers: Answer[] }

const PII_LABEL: Record<string, string> = { email: "email removed", phone: "phone number removed", card: "card number removed" };
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  answered: { label: "Answered by AI", bg: "#f1f5f9", fg: "#475569" },
  unanswered: { label: "Unanswered", bg: "#fef3c7", fg: "#92400e" },
  staff_answered: { label: "Answered by your team", bg: "#dcfce7", fg: "#166534" },
};
const pill = (bg: string, fg: string): React.CSSProperties => ({ display: "inline-block", padding: "1px 8px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 600, background: bg, color: fg, whiteSpace: "nowrap" });
const card: React.CSSProperties = { border: "1px solid #eee", borderRadius: "8px", padding: "0.85rem 1rem", marginBottom: "0.75rem" };
const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, fontSize: "0.78rem", color: "#555", textDecoration: "underline", cursor: "pointer" };
const btn: React.CSSProperties = { padding: "5px 12px", fontSize: "0.8rem", background: "#111", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" };
const tab = (on: boolean): React.CSSProperties => ({ padding: "5px 12px", fontSize: "0.82rem", border: "1px solid #ddd", background: on ? "#111" : "#fff", color: on ? "#fff" : "#333", cursor: "pointer" });

export function QuestionsView({ shop, productId, themes, questions, answers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"themes" | "verbatim">("themes");
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [answering, setAnswering] = useState<string | null>(null);   // "theme:<id>" or "question:<id>"
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) { setError(res.error); return; }
      after?.();
      router.refresh();
    });
  }

  function answerForm(key: string, question: string, themeId: string | null, questionId: string | null) {
    if (answering !== key) {
      return <button type="button" style={linkBtn} onClick={() => { setAnswering(key); setDraft(""); }}>Answer</button>;
    }
    return (
      <div style={{ marginTop: "0.5rem" }}>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1500} autoFocus
          placeholder="Your answer. The assistant uses it for future questions like this."
          style={{ width: "100%", minHeight: "64px", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.88rem", fontFamily: "inherit", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.35rem", alignItems: "center" }}>
          <button type="button" style={btn} disabled={isPending}
            onClick={() => run(() => answerAction(shop, productId, { themeId, questionId, question, answer: draft }), () => setAnswering(null))}>Save answer</button>
          <button type="button" style={linkBtn} onClick={() => setAnswering(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  const shownThemes = onlyUnanswered ? themes.filter((t) => t.unanswered > 0) : themes;
  const shownQuestions = onlyUnanswered ? questions.filter((q) => q.status === "unanswered") : questions;

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div role="tablist" style={{ display: "inline-flex" }}>
          <button type="button" role="tab" aria-selected={mode === "themes"} style={{ ...tab(mode === "themes"), borderRadius: "5px 0 0 5px" }} onClick={() => setMode("themes")}>Themes</button>
          <button type="button" role="tab" aria-selected={mode === "verbatim"} style={{ ...tab(mode === "verbatim"), borderRadius: "0 5px 5px 0", borderLeft: "none" }} onClick={() => setMode("verbatim")}>Verbatim</button>
        </div>
        <label style={{ fontSize: "0.85rem", color: "#444", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
          <input type="checkbox" checked={onlyUnanswered} onChange={(e) => setOnlyUnanswered(e.target.checked)} /> Unanswered only
        </label>
        <span style={{ fontSize: "0.82rem", color: "#888" }}>{questions.length} question{questions.length === 1 ? "" : "s"}</span>
      </div>
      {error && <p role="alert" style={{ color: "#c00", fontSize: "0.85rem" }}>{error}</p>}

      {mode === "themes" ? (
        shownThemes.length === 0 ? <p style={{ color: "#888", fontSize: "0.9rem" }}>Nothing here.</p> : shownThemes.map((t) => (
          <div key={t.id ?? "ungrouped"} style={card}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
              <strong style={{ fontSize: "0.95rem", color: "#111" }}>{t.label}</strong>
              {t.store_theme && <span style={pill("#f4f4f5", "#52525b")}>{t.store_theme}</span>}
              <span style={{ fontSize: "0.8rem", color: "#888" }}>asked {t.count}×</span>
              {t.unanswered > 0 && <span style={pill(STATUS.unanswered!.bg, STATUS.unanswered!.fg)}>{t.unanswered} unanswered</span>}
            </div>
            {t.latest_answer && <p style={{ fontSize: "0.85rem", color: "#555", margin: "0.4rem 0 0" }}><span style={{ color: "#999" }}>Latest answer: </span>{t.latest_answer}</p>}
            {t.id && <div style={{ marginTop: "0.4rem" }}>{answerForm(`theme:${t.id}`, t.label, t.id, null)}</div>}
          </div>
        ))
      ) : (
        shownQuestions.length === 0 ? <p style={{ color: "#888", fontSize: "0.9rem" }}>Nothing here.</p> : shownQuestions.map((q) => {
          const st = STATUS[q.status];
          return (
            <div key={q.id} style={card}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.92rem", color: "#111" }}>{q.question_text}</span>
                {st && <span style={pill(st.bg, st.fg)}>{st.label}</span>}
                {q.asked_by === "staff" && <span style={pill("#ede9fe", "#5b21b6")}>Staff{q.staff_name ? ` · ${q.staff_name}` : ""}</span>}
                {q.pii_removed.map((p) => <span key={p} style={pill("#fee2e2", "#991b1b")}>{PII_LABEL[p] ?? p}</span>)}
              </div>
              {q.answer_text && <p style={{ fontSize: "0.85rem", color: "#555", margin: "0.35rem 0 0" }}>{q.answer_text}</p>}
              <p style={{ fontSize: "0.72rem", color: "#aaa", margin: "0.35rem 0 0" }}>
                {new Date(q.created_at).toLocaleString()}{q.theme_label ? ` · ${q.theme_label}` : ""}
              </p>
              <div style={{ display: "flex", gap: "0.9rem", marginTop: "0.35rem" }}>
                {q.status === "unanswered" && answerForm(`question:${q.id}`, q.question_text, q.theme_id, q.id)}
                <button type="button" style={linkBtn} disabled={isPending} onClick={() => run(() => dismissQuestionAction(shop, productId, q.id))}>Dismiss</button>
              </div>
            </div>
          );
        })
      )}

      <section style={{ marginTop: "2rem", borderTop: "1px solid #eee", paddingTop: "1.25rem" }}>
        <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35rem" }}>Your answers</h2>
        <p style={{ fontSize: "0.82rem", color: "#888", margin: "0 0 0.9rem" }}>
          The assistant uses these first. They aren&apos;t shown on the product page unless you add them.
        </p>
        {answers.length === 0 ? <p style={{ fontSize: "0.85rem", color: "#999" }}>None yet.</p> : answers.map((a) => (
          <div key={a.id} style={card}>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#111", fontWeight: 600 }}>{a.question}{a.scope === "store" && <span style={{ ...pill("#f4f4f5", "#52525b"), marginLeft: "0.4rem" }}>Store-wide</span>}</p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", color: "#444" }}>{a.answer}</p>
            {a.scope === "product" && (
              <div style={{ display: "flex", gap: "0.9rem", marginTop: "0.45rem", flexWrap: "wrap" }}>
                <button type="button" style={linkBtn} disabled={isPending} onClick={() => run(() => promoteAction(shop, productId, "faq", a.question, a.answer))}>Show on product page</button>
                <button type="button" style={linkBtn} disabled={isPending} onClick={() => run(() => promoteAction(shop, productId, "training", a.question, a.answer))}>Add to training Q&amp;A</button>
                <button type="button" style={linkBtn} disabled={isPending} onClick={() => run(() => retireAnswerAction(shop, productId, a.id))}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
