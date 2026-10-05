// PRD v4 §7 Step 15c: one customer question, start to finish. Validates it,
// strips personal details before the model sees it (D10), enforces the per-
// visit cap (D22), streams the answer, and records the question unless the
// store's own team is previewing the page. Dependencies are injected so this
// has no database or network access of its own.
import { redactPii, type PiiType, type QuestionSource } from "@nfc/db";
import { SYSTEM_PROMPT, buildContext, SOURCE_LABELS, type AnswerContext } from "./prompt.js";
import { MetaSplitter } from "./meta.js";

export const MAX_QUESTIONS_PER_VISIT = 10;
export const VISIT_HOURS = 4;
export const MAX_QUESTION_CHARS = 500;
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_CHARS = 1000;
const LIMIT_REPLY = "That's all the questions I can take about this product for now. An associate nearby is happy to help with anything else.";

export interface HistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ModelMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LoadedContext {
  storeId: string;
  productId: string;
  tagId: string;
  context: AnswerContext;
}

export interface RecordInput {
  storeId: string;
  productId: string;
  tagId: string;
  sessionId: string | null;
  askedBy: "customer";
  questionText: string;
  answerText: string | null;
  sources: QuestionSource[];
  status: "answered" | "unanswered";
  language: string | null;
}

export interface AskDeps {
  loadContext(tagUuid: string): Promise<LoadedContext | null>;
  countRecent(sessionId: string, productId: string, hours: number): Promise<number>;
  record(q: RecordInput): Promise<void>;
  streamModel(system: { rules: string; context: string }, messages: ModelMessage[]): AsyncIterable<string>;
}

export interface AskInput {
  tagUuid: string;
  question: string;
  history: HistoryTurn[];
  sessionId: string | null;
  isTeam: boolean;   // the store's own staff or owner previewing the customer page
}

export type AskEvent =
  | { type: "pii"; removed: PiiType[] }
  | { type: "delta"; text: string }
  | { type: "done"; status: "answered" | "unanswered"; sources: string[] }
  | { type: "limit"; text: string }
  | { type: "error"; message: string };

function cleanHistory(history: HistoryTurn[]): ModelMessage[] {
  const valid = (Array.isArray(history) ? history : [])
    .filter((t) => (t?.role === "user" || t?.role === "assistant") && typeof t.text === "string" && t.text.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({
      role: t.role,
      content: (t.role === "user" ? redactPii(t.text).text : t.text).slice(0, MAX_HISTORY_CHARS),
    }));
  while (valid.length && valid[0]!.role !== "user") valid.shift();
  return valid;
}

export async function* handleAsk(input: AskInput, deps: AskDeps): AsyncGenerator<AskEvent> {
  const raw = (input.question ?? "").trim();
  if (!raw) { yield { type: "error", message: "Type a question first" }; return; }
  if (raw.length > MAX_QUESTION_CHARS) { yield { type: "error", message: `Keep your question under ${MAX_QUESTION_CHARS} characters` }; return; }

  const loaded = await deps.loadContext(input.tagUuid);
  if (!loaded) { yield { type: "error", message: "This product isn't available" }; return; }

  const recording = !input.isTeam;
  if (recording && input.sessionId) {
    const asked = await deps.countRecent(input.sessionId, loaded.productId, VISIT_HOURS);
    if (asked >= MAX_QUESTIONS_PER_VISIT) { yield { type: "limit", text: LIMIT_REPLY }; return; }
  }

  const question = redactPii(raw);
  if (question.removed.length) yield { type: "pii", removed: question.removed };

  const messages = [...cleanHistory(input.history), { role: "user" as const, content: question.text }];
  const splitter = new MetaSplitter();
  let answer = "";
  try {
    for await (const chunk of deps.streamModel({ rules: SYSTEM_PROMPT, context: buildContext(loaded.context) }, messages)) {
      const text = splitter.push(chunk);
      if (text) { answer += text; yield { type: "delta", text }; }
    }
  } catch (err) {
    console.error("[ask] model failed:", err);
    yield { type: "error", message: "Something went wrong. Try again in a moment." };
    return;
  }
  const { text: tail, meta } = splitter.end();
  if (tail) { answer += tail; yield { type: "delta", text: tail }; }

  const labels = [...new Set(meta.sources.map((s) => SOURCE_LABELS[s]).filter((l): l is string => !!l))];
  yield { type: "done", status: meta.status, sources: labels };

  if (recording) {
    const sources: QuestionSource[] = meta.topic === "stock"
      ? [{ kind: "stock_reply" }]
      : meta.sources.filter((s) => s in SOURCE_LABELS).map((kind) => ({ kind }));
    try {
      await deps.record({
        storeId: loaded.storeId,
        productId: loaded.productId,
        tagId: loaded.tagId,
        sessionId: input.sessionId,
        askedBy: "customer",
        questionText: raw,   // recordQuestion strips personal details again on write
        answerText: meta.status === "unanswered" ? null : answer.trim(),
        sources,
        status: meta.status,
        language: meta.language,
      });
    } catch (err) {
      console.error("[ask] recording the question failed:", err);
    }
  }
}
