import type { ProductTrainingInput, TrainingQuestion } from "@nfc/db";

// What the Staff Training form sends: raw strings, every field optional.
export interface TrainingFormData {
  one_line_sell: string;
  who_its_for: string;
  who_its_not_for: string;
  fit_and_sizing: string;
  worth_the_price: string[];
  closest_alternative: string;
  common_questions: TrainingQuestion[];
  companion_products: string;
  brand_context: string;
  stock_note: string;
}

export const MAX_WORTH_THE_PRICE = 3;
export const MAX_COMMON_QUESTIONS = 5;

const text = (s: string): string | null => s.trim() || null;

export function normalizeTrainingForm(f: TrainingFormData): ProductTrainingInput {
  return {
    one_line_sell: text(f.one_line_sell),
    who_its_for: text(f.who_its_for),
    who_its_not_for: text(f.who_its_not_for),
    fit_and_sizing: text(f.fit_and_sizing),
    worth_the_price: f.worth_the_price.map((r) => r.trim()).filter(Boolean).slice(0, MAX_WORTH_THE_PRICE),
    closest_alternative: text(f.closest_alternative),
    common_questions: f.common_questions
      .map((q) => ({ question: q.question.trim(), answer: q.answer.trim() }))
      .filter((q) => q.question)
      .slice(0, MAX_COMMON_QUESTIONS),
    companion_products: text(f.companion_products),
    brand_context: text(f.brand_context),
    stock_note: text(f.stock_note),
  };
}

// Fills the fields the owner hasn't written yet from an AI draft. Never
// overwrites the owner's text and never touches the stock note.
export function fillEmptyFromDraft(
  form: TrainingFormData,
  draft: Omit<TrainingFormData, "stock_note">,
): TrainingFormData {
  const pick = (mine: string, ai: string) => (mine.trim() ? mine : ai);
  const hasReasons = form.worth_the_price.some((r) => r.trim());
  const reasons = hasReasons ? form.worth_the_price : draft.worth_the_price.slice(0, MAX_WORTH_THE_PRICE);
  return {
    one_line_sell: pick(form.one_line_sell, draft.one_line_sell),
    who_its_for: pick(form.who_its_for, draft.who_its_for),
    who_its_not_for: pick(form.who_its_not_for, draft.who_its_not_for),
    fit_and_sizing: pick(form.fit_and_sizing, draft.fit_and_sizing),
    worth_the_price: [...reasons, "", "", ""].slice(0, Math.max(MAX_WORTH_THE_PRICE, reasons.length)),
    closest_alternative: pick(form.closest_alternative, draft.closest_alternative),
    common_questions: form.common_questions.some((q) => q.question.trim())
      ? form.common_questions
      : draft.common_questions.slice(0, MAX_COMMON_QUESTIONS),
    companion_products: pick(form.companion_products, draft.companion_products),
    brand_context: pick(form.brand_context, draft.brand_context),
    stock_note: form.stock_note,
  };
}
