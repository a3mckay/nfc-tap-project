// PRD v4 §7 Step 15k: after a product's copy or training notes are saved, or
// Generate runs, a quick check looks for notes that contradict each other
// (docs/PRD-ai-assistant.md D49). Findings are saved as flags and shown on the
// product editor so the owner fixes the source. The model is injected.
import Anthropic from "@anthropic-ai/sdk";

export interface ProductNotes {
  title: string;
  productType: string | null;
  customer: {
    fit_notes: string | null; materials: string | null; backstory: string | null; care_instructions: string | null;
    great_when: string[]; faq: Array<{ question: string; answer: string }>;
  } | null;
  training: {
    fit_and_sizing: string | null; who_its_for: string | null; who_its_not_for: string | null; closest_alternative: string | null;
    common_questions: Array<{ question: string; answer: string }>;
  } | null;
  facts: Array<{ topic: string; fact: string }>;
  // The product's category's words (docs/category-labels.md). Defaults are clothing's.
  labels?: { fit: string; materials: string; care: string; truth: string };
}

const DEFAULT_LABELS = { fit: "Fit notes", materials: "Materials", care: "Care", truth: "Fit and sizing" };

const line = (source: string, field: string, value: string | null | undefined) => (value?.trim() ? `${source} – ${field}: ${value.trim()}` : null);

export function describeProductNotes(n: ProductNotes): string {
  const c = n.customer;
  const t = n.training;
  const l = n.labels ?? DEFAULT_LABELS;
  const name = (label: string) => label.toLowerCase();
  return [
    `Product: ${n.title}${n.productType ? ` (${n.productType})` : ""}`,
    line("Customer copy", name(l.fit), c?.fit_notes),
    line("Customer copy", name(l.materials), c?.materials),
    line("Customer copy", "story", c?.backstory),
    line("Customer copy", name(l.care), c?.care_instructions),
    c?.great_when.length ? `Customer copy – great when: ${c.great_when.join("; ")}` : null,
    ...(c?.faq ?? []).map((f) => `Customer copy – FAQ: ${f.question} ${f.answer}`),
    line("Staff training", name(l.truth), t?.fit_and_sizing),
    line("Staff training", "who it's for", t?.who_its_for),
    line("Staff training", "who it's not for", t?.who_its_not_for),
    line("Staff training", "closest alternative", t?.closest_alternative),
    ...(t?.common_questions ?? []).map((q) => `Staff training – Q&A: ${q.question} ${q.answer}`),
    ...n.facts.map((f) => `Research fact (${f.topic}): ${f.fact}`),
  ].filter(Boolean).join("\n");
}

export interface CheckDeps {
  model(notes: string): Promise<string[]>;
  save(messages: string[]): Promise<void>;
}

export async function runConsistencyCheck(notes: ProductNotes, deps: CheckDeps): Promise<void> {
  const text = describeProductNotes(notes);
  if (text.split("\n").length < 3) {   // the title plus fewer than two notes: nothing to compare
    await deps.save([]);
    return;
  }
  let found: string[];
  try {
    found = await deps.model(text);
  } catch (err) {
    console.error("[consistency] check failed:", err);
    return;
  }
  await deps.save(found);
}

// The real check: Claude Haiku 4.5 with a structured output (a cheap, simple task).
export async function findContradictions(notes: string): Promise<string[]> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: "You check a shop's notes about one product for direct contradictions: two notes that can't both be true (e.g. 'runs true to size' vs 'runs large', 'leather' vs 'synthetic'). Ignore differences in detail or tone, and things only one note mentions. For each contradiction, write one short sentence naming both sources and what they say. Return an empty list if there are none.",
    output_config: {
      format: {
        type: "json_schema",
        schema: { type: "object", properties: { contradictions: { type: "array", items: { type: "string" } } }, required: ["contradictions"], additionalProperties: false },
      },
    },
    messages: [{ role: "user", content: notes }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming);
  const text = res.content.find((b) => b.type === "text");
  return (JSON.parse(text && text.type === "text" ? text.text : '{"contradictions":[]}') as { contradictions: string[] }).contradictions;
}
