// Optional AI first draft of a product's staff training notes (PRD v4 §7 Step 13e).
// The owner reviews and edits it before saving. The stock note is never drafted:
// only the owner knows what's in the back.
import type Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

export const TRAINING_DRAFT_MODEL = "claude-opus-5-5";

export interface TrainingDraftContext {
  title: string;
  vendor: string | null;
  productType: string | null;
  description: string | null;
  existingCopy: {
    fit_notes: string | null;
    backstory: string | null;
    materials: string | null;
    reasons_to_buy: string[];
    faq: { question: string; answer: string }[];
  } | null;
  otherProducts: string[];
}

export interface TrainingDraft {
  one_line_sell: string;
  who_its_for: string;
  who_its_not_for: string;
  fit_and_sizing: string;
  worth_the_price: string[];
  closest_alternative: string;
  common_questions: { question: string; answer: string }[];
  companion_products: string;
  brand_context: string;
}

const format = jsonSchemaOutputFormat({
  type: "object",
  properties: {
    one_line_sell: { type: "string", description: "One sentence an associate says when a customer picks this up. How they'd actually say it, not marketing copy." },
    who_its_for: { type: "string", description: "2-3 customer profiles this genuinely suits, comma-separated." },
    who_its_not_for: { type: "string", description: "Honest limitations: who it isn't right for." },
    fit_and_sizing: { type: "string", description: "Honest fit and sizing guidance. Empty string if unknown or not applicable." },
    worth_the_price: { type: "array", items: { type: "string" }, description: "2-3 specific reasons it justifies its price." },
    closest_alternative: { type: "string", description: "How it compares to the closest alternative among the store's other products. Empty string if none is close." },
    common_questions: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
        additionalProperties: false,
      },
      description: "3-5 questions customers commonly ask about this product, with short honest answers.",
    },
    companion_products: { type: "string", description: "What pairs naturally with this, preferring the store's other products. Empty string if nothing fits." },
    brand_context: { type: "string", description: "One short paragraph on the brand and what sets it apart from chain-store alternatives." },
  },
  required: [
    "one_line_sell", "who_its_for", "who_its_not_for", "fit_and_sizing", "worth_the_price",
    "closest_alternative", "common_questions", "companion_products", "brand_context",
  ],
  additionalProperties: false,
} as const);

function contextText(c: TrainingDraftContext): string {
  const lines = [
    `Product: ${c.title}`,
    c.vendor && `Brand: ${c.vendor}`,
    c.productType && `Type: ${c.productType}`,
    c.description && `Description: ${c.description}`,
    c.existingCopy?.fit_notes && `Fit notes from the product page: ${c.existingCopy.fit_notes}`,
    c.existingCopy?.materials && `Materials: ${c.existingCopy.materials}`,
    c.existingCopy?.backstory && `Backstory: ${c.existingCopy.backstory}`,
    c.existingCopy?.reasons_to_buy.length && `Reasons to buy: ${c.existingCopy.reasons_to_buy.join("; ")}`,
    c.existingCopy?.faq.length && `Customer FAQ: ${c.existingCopy.faq.map((f) => `${f.question} ${f.answer}`).join(" | ")}`,
    c.otherProducts.length && `Other products in this store: ${c.otherProducts.join(", ")}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export async function draftTraining(client: Anthropic, context: TrainingDraftContext): Promise<TrainingDraft> {
  const response = await client.messages.parse({
    model: TRAINING_DRAFT_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format },
    system:
      "You help independent boutique owners write training notes for their floor staff. " +
      "Write the way an experienced associate talks to a customer: plain, honest, specific. " +
      "No marketing language. Only state facts supported by the information given; " +
      "when you don't know something (for example exact sizing), leave that field as an empty string " +
      "rather than guessing. The owner will review and edit everything.",
    messages: [{ role: "user", content: `Draft staff training notes for this product.\n\n${contextText(context)}` }],
  });

  if (response.stop_reason === "refusal") throw new Error("The AI declined to draft notes for this product");
  if (!response.parsed_output) throw new Error("The AI draft came back incomplete");
  return response.parsed_output as TrainingDraft;
}
