// PRD v4 §7 Step 15e: browser-side helpers for the Ask chat on the tap page.
// Kept free of React so they can be tested on their own.
import type { AskEvent } from "./handle.js";

// Reads the newline-delimited JSON stream from POST /api/ask.
export class NdjsonReader {
  private buffer = "";

  push(chunk: string): AskEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    const events: AskEvent[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try { events.push(JSON.parse(line) as AskEvent); } catch { /* skip a malformed line */ }
    }
    return events;
  }
}

const GENERAL_QUESTIONS = ["What's it made of?", "How does it fit?", "How do I care for it?"];

// Suggested-question chips (D23): the product's FAQ first, then general ones.
// Counts ("12 people asked this") come later, once there's data.
export function suggestedQuestions(faq: Array<{ question: string; answer: string }>): string[] {
  const fromFaq = faq.map((f) => f.question.trim()).filter(Boolean);
  return (fromFaq.length ? fromFaq : GENERAL_QUESTIONS).slice(0, 3);
}

const PII_NAMES: Record<string, string> = { email: "an email address", phone: "a phone number", card: "a card number" };

// Tells the customer what was removed from their message (D30).
export function piiNotice(removed: string[]): string | null {
  const names = removed.map((r) => PII_NAMES[r]).filter(Boolean);
  if (!names.length) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `We removed ${list} from your message to keep it private.`;
}

// The three key points at the top of the page (D21): "Great when…", else the
// first three reasons to buy.
export function keyPoints(greatWhen: string[], reasonsToBuy: string[]): { title: string; points: string[] } | null {
  if (greatWhen.length) return { title: "Great when…", points: greatWhen.slice(0, 3) };
  if (reasonsToBuy.length) return { title: "Why we love it", points: reasonsToBuy.slice(0, 3) };
  return null;
}

// The disclosure under the chat input (D19, §7.1).
export const DISCLOSURE = (storeName: string) =>
  `Answers are AI-generated. Questions are saved anonymously to help ${storeName} improve.`;

// The chat and the floating picks pill share the bottom of the screen (D37):
// the pill hides while the chat is open.
export const CHAT_EVENT = "tapshelf:chat";
