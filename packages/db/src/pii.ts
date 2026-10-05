// Strips personal details from free text before it's stored (PRD v4 §7 Step
// 15a; docs/PRD-ai-assistant.md D10, D30). Each match is replaced with a
// placeholder naming its type, and the types found are reported so the chat and
// the owner's verbatim view can say what was removed.
//
// Deliberately narrow: emails, phone numbers and card numbers. Names aren't
// detected; there's no reliable way to tell them from product and brand names.

export type PiiType = "email" | "phone" | "card";

export interface Redacted {
  text: string;
  removed: PiiType[];
}

const PLACEHOLDER: Record<PiiType, string> = {
  email: "[email removed]",
  phone: "[phone number removed]",
  card: "[card number removed]",
};

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// 13–19 digits, optionally grouped by spaces or dashes; confirmed with Luhn.
const CARD = /\b\d(?:[ -]?\d){12,18}\b/g;
// +international, or North American 10 digits (optional leading 1), with the
// usual separators. Requires the full digit count, so sizes, prices and style
// codes don't match.
const PHONE = /(?:\+\d{1,3}[ .-]?)?(?:\(\d{3}\)|\b\d{3})[ .-]?\d{3}[ .-]?\d{4}\b|\+\d{1,3}(?:[ .-]?\d{2,4}){2,4}\b|\b1[ .-]\d{3}[ .-]\d{3}[ .-]\d{4}\b/g;

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function redactPii(input: string): Redacted {
  const found = new Set<PiiType>();
  let text = input.replace(EMAIL, () => { found.add("email"); return PLACEHOLDER.email; });
  text = text.replace(CARD, (m) => {
    if (!luhn(m.replace(/\D/g, ""))) return m;
    found.add("card");
    return PLACEHOLDER.card;
  });
  text = text.replace(PHONE, () => { found.add("phone"); return PLACEHOLDER.phone; });
  const order: PiiType[] = ["email", "phone", "card"];
  return { text, removed: order.filter((t) => found.has(t)) };
}
