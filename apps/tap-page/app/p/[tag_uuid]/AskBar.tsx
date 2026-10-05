"use client";

// PRD v4 §7 Step 15e: "Ask about this ✦". A full-width bar at the bottom of the
// tap page (D4, D37) that opens a half-screen chat. The chat can be expanded
// and minimized back to the bar, and the conversation is kept for the visit.
// Answers stream from POST /api/ask (src/ask/handle.ts).
import { useEffect, useRef, useState } from "react";
import { NdjsonReader, piiNotice, DISCLOSURE, CHAT_EVENT } from "@/ask/client.js";

interface Props {
  tagUuid: string;
  productTitle: string;
  storeName: string;
  primaryColor: string;
  suggestions: string[];
  endpoint?: string;   // "/api/staff-ask" in the staff training view (Step 15h)
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  notice?: string | null;   // e.g. personal details removed
  muted?: boolean;          // errors and limits
}

const storageKey = (tagUuid: string, endpoint: string) => `tapshelf_chat_${endpoint === "/api/ask" ? "" : "staff_"}${tagUuid}`;

function loadMessages(tagUuid: string, endpoint: string): Message[] {
  try {
    const raw = sessionStorage.getItem(storageKey(tagUuid, endpoint));
    const parsed = raw ? (JSON.parse(raw) as Message[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(tagUuid: string, endpoint: string, messages: Message[]) {
  try { sessionStorage.setItem(storageKey(tagUuid, endpoint), JSON.stringify(messages.slice(-20))); } catch { /* storage unavailable */ }
}

export function AskBar({ tagUuid, productTitle, storeName, primaryColor, suggestions, endpoint = "/api/ask" }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSources, setShowSources] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMessages(loadMessages(tagUuid, endpoint)); }, [tagUuid, endpoint]);
  useEffect(() => { saveMessages(tagUuid, endpoint, messages); }, [tagUuid, endpoint, messages]);
  useEffect(() => { window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: { open } })); }, [open]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages, open]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history = messages.filter((m) => !m.muted).map((m) => ({ role: m.role, text: m.text }));
    setDraft("");
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: "" }]);
    const update = (fn: (m: Message) => Message) =>
      setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1]!)]);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagUuid, question: q, history }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        update(() => ({ role: "assistant", text: body.error ?? "Questions aren't available right now.", muted: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const ndjson = new NdjsonReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const e of ndjson.push(decoder.decode(value, { stream: true }))) {
          if (e.type === "pii") update((m) => ({ ...m, notice: piiNotice(e.removed) }));
          if (e.type === "delta") update((m) => ({ ...m, text: m.text + e.text }));
          if (e.type === "done") update((m) => ({ ...m, sources: e.sources }));
          if (e.type === "limit") update((m) => ({ ...m, text: e.text, muted: true }));
          if (e.type === "error") update((m) => ({ ...m, text: e.message, muted: true }));
        }
      }
    } catch {
      update(() => ({ role: "assistant", text: "Something went wrong. Try again in a moment.", muted: true }));
    } finally {
      setBusy(false);
    }
  }

  const bar = (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "#fff", borderTop: "1px solid #eee", padding: "0.65rem 1rem calc(0.65rem + env(safe-area-inset-bottom))" }}>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Ask about the ${productTitle}`}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.7rem 1rem", border: "1px solid #ddd", borderRadius: "999px", background: "#fafafa", fontSize: "0.95rem", color: "#666", fontFamily: "inherit", cursor: "text", textAlign: "left" }}>
        <span aria-hidden="true" style={{ color: primaryColor, fontWeight: 700 }}>✦</span>
        Ask about this
      </button>
    </div>
  );

  if (!open) return bar;

  return (
    <div role="dialog" aria-label={`Questions about the ${productTitle}`}
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, height: expanded ? "92vh" : "60vh", background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", boxShadow: "0 -8px 30px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", transition: "height 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderBottom: "1px solid #f0f0f0" }}>
        <span aria-hidden="true" style={{ color: primaryColor, fontWeight: 700 }}>✦</span>
        <p style={{ flex: 1, margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{productTitle}</p>
        <button type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Shrink chat" : "Expand chat"}
          style={{ background: "none", border: "none", fontSize: "1.1rem", color: "#888", cursor: "pointer", padding: "0.25rem 0.5rem" }}>{expanded ? "▾" : "▴"}</button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Minimize chat"
          style={{ background: "none", border: "none", fontSize: "0.85rem", color: "#666", cursor: "pointer", padding: "0.25rem 0.5rem" }}>Minimize</button>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 0.75rem" }}>Ask anything about the {productTitle}.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)}
                  style={{ padding: "0.45rem 0.85rem", border: `1px solid ${primaryColor}33`, borderRadius: "999px", background: "#fff", fontSize: "0.82rem", color: "#333", fontFamily: "inherit", cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            {m.notice && <p style={{ fontSize: "0.72rem", color: "#888", margin: "0 0 0.25rem" }}>{m.notice}</p>}
            <div style={{ padding: "0.6rem 0.85rem", borderRadius: "14px", fontSize: "0.92rem", lineHeight: 1.45,
              background: m.role === "user" ? primaryColor : m.muted ? "#f6f6f6" : "#f2f2f2",
              color: m.role === "user" ? "#fff" : m.muted ? "#777" : "#222" }}>
              {m.text || (busy && i === messages.length - 1 ? <span aria-label="Answer loading" style={{ color: "#999" }}>…</span> : null)}
            </div>
            {m.role === "assistant" && !!m.sources?.length && (
              <div style={{ marginTop: "0.25rem" }}>
                <button type="button" onClick={() => setShowSources(showSources === i ? null : i)}
                  style={{ background: "none", border: "none", padding: 0, fontSize: "0.72rem", color: "#999", cursor: "pointer", textDecoration: "underline" }}>Sources</button>
                {showSources === i && <span style={{ fontSize: "0.72rem", color: "#999" }}> · {m.sources.join(" · ")}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void ask(draft); }}
        style={{ borderTop: "1px solid #f0f0f0", padding: "0.6rem 1rem calc(0.6rem + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500}
            placeholder="Ask about this" aria-label="Your question" enterKeyHint="send"
            style={{ flex: 1, padding: "0.65rem 0.9rem", border: "1px solid #ddd", borderRadius: "999px", fontSize: "16px", fontFamily: "inherit" }} />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send"
            style={{ padding: "0 1rem", border: "none", borderRadius: "999px", background: primaryColor, color: "#fff", fontSize: "0.9rem", fontWeight: 600, fontFamily: "inherit", opacity: busy || !draft.trim() ? 0.5 : 1, cursor: "pointer" }}>Send</button>
        </div>
        <p style={{ fontSize: "0.68rem", color: "#999", margin: "0.4rem 0 0", textAlign: "center" }}>{DISCLOSURE(storeName)}</p>
      </form>
    </div>
  );
}
