// PRD v4 §7 Step 15c: one customer question, start to finish. Validates it,
// strips personal details before the model sees it (D10), enforces the per-
// visit cap (D22), streams the answer, and records the question unless the
// store's own team is previewing the page. Dependencies are injected so this
// has no database or network access of its own.
import { redactPii, type PiiType, type QuestionSource } from "@nfc/db";
import { SYSTEM_PROMPT, buildContext, SOURCE_LABELS, STOCK_REPLY, PRICE_REPLY, unansweredReply, offTopicReply, type AnswerContext } from "./prompt.js";
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

type Mode = "answer" | "unanswered" | "stock" | "price" | "off_topic";
const MODE_LINE = /^\s*\[(answer|unanswered|stock|price|off_topic)(?:\s+([a-z]{2}))?\]\s*\n?/i;
const LABEL_REMINDER = "Check the label to be sure.";
// Questions that always get the label reminder when answered (D9), whatever the
// model flagged: a backstop for the regulated-facts rule.
const REGULATED_QUESTION = /\b(allerg\w*|gluten|vegan|dairy|nuts?|sul(f|ph)ites?|ingredients?|alcohol|abv|thc|cbd|effects?|anxiety|sleep|pain|pregnan\w*|medic\w*|drug|health\w*|safe(ty)?|pesticides?|uv|polari[sz]ed|eclipse|cataract|impact|hypoallergenic|organic|oeko-?tex|flame)\b/i;

// Reads the model's leading "[mode lang]" line. Returns null until it can tell;
// output without a mode line is treated as an answer.
function readModeLine(buffer: string, final: boolean): { mode: Mode; language: string | null; rest: string } | null {
  const m = MODE_LINE.exec(buffer);
  if (m && (m[0].endsWith("\n") || final)) {
    return { mode: m[1]!.toLowerCase() as Mode, language: m[2]?.toLowerCase() ?? null, rest: buffer.slice(m[0].length) };
  }
  if (!final && /^\s*\[?[a-z_ ]{0,20}\]?\s*$/i.test(buffer)) return null;   // could still be a mode line
  return { mode: "answer", language: null, rest: buffer };
}

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
  const ctx = loaded.context;
  const fixed: Record<Exclude<Mode, "answer">, string> = {
    unanswered: unansweredReply(ctx.storeName),
    stock: STOCK_REPLY,
    price: PRICE_REPLY,
    off_topic: offTopicReply(ctx.product.title),
  };

  const splitter = new MetaSplitter();
  let head = "";
  let mode: { mode: Mode; language: string | null } | null = null;
  let answer = "";        // what the customer was shown
  let translated = "";    // a fixed reply the model translated (non-English only)
  const take = (text: string) => {
    const out = splitter.push(text);
    if (mode!.mode === "answer") { answer += out; return out; }
    translated += out;
    return "";
  };
  try {
    for await (const chunk of deps.streamModel({ rules: SYSTEM_PROMPT, context: buildContext(ctx) }, messages)) {
      let text = chunk;
      if (!mode) {
        head += chunk;
        const read = readModeLine(head, false);
        if (!read) continue;
        mode = read;
        text = read.rest;
      }
      const out = take(text);
      if (out) yield { type: "delta", text: out };
    }
    if (!mode) {   // the whole reply was shorter than a mode line could be
      const read = readModeLine(head, true)!;
      mode = read;
      const out = take(read.rest);
      if (out) yield { type: "delta", text: out };
    }
  } catch (err) {
    console.error("[ask] model failed:", err);
    yield { type: "error", message: "Something went wrong. Try again in a moment." };
    return;
  }
  const { text: tail, meta } = splitter.end();
  const english = !mode.language || mode.language === "en";

  if (mode.mode === "answer" && !(answer + tail).trim()) {   // e.g. the model declined to respond
    yield { type: "error", message: "Something went wrong. Try again in a moment." };
    return;
  }
  if (mode.mode === "answer") {
    let rest = tail;
    if ((meta.regulated || REGULATED_QUESTION.test(raw)) && english && (answer + rest).trim() && !/check the label/i.test(answer + rest)) {
      rest = `${rest}${(answer + rest).trim() ? " " : ""}${LABEL_REMINDER}`;
    }
    if (rest) { answer += rest; yield { type: "delta", text: rest }; }
  } else {
    translated += tail;
    answer = english || !translated.trim() ? fixed[mode.mode] : translated.trim();
    yield { type: "delta", text: answer };
  }

  const status = mode.mode === "unanswered" ? "unanswered" : "answered";
  const labels = mode.mode === "answer"
    ? [...new Set(meta.sources.map((s) => SOURCE_LABELS[s]).filter((l): l is string => !!l))]
    : [];
  yield { type: "done", status, sources: labels };

  if (recording) {
    const sources: QuestionSource[] =
      mode.mode === "stock" ? [{ kind: "stock_reply" }]
      : mode.mode === "price" ? [{ kind: "price_reply" }]
      : mode.mode === "off_topic" ? [{ kind: "off_topic" }]
      : meta.sources.filter((s) => s in SOURCE_LABELS).map((kind) => ({ kind }));
    try {
      await deps.record({
        storeId: loaded.storeId,
        productId: loaded.productId,
        tagId: loaded.tagId,
        sessionId: input.sessionId,
        askedBy: "customer",
        questionText: raw,   // recordQuestion strips personal details again on write
        answerText: status === "unanswered" ? null : answer.trim(),
        sources,
        status,
        language: mode.language,
      });
    } catch (err) {
      console.error("[ask] recording the question failed:", err);
    }
  }
}
