// PRD v4 §7 Step 15f: the model that groups questions into themes. Grouping is
// a simple sorting task, so it uses Claude Haiku 4.5 (the founder's value-first
// choice, D16) with a structured output.
import Anthropic from "@anthropic-ai/sdk";
import { THEME_KINDS, type ClassifyInput, type ClassifyOutput } from "./group.js";

export const GROUPING_MODEL = "claude-haiku-4-5";

const SCHEMA = {
  type: "object",
  properties: {
    assignments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_id: { type: "string" },
          theme_id: { type: ["string", "null"] },
          new_theme: {
            anyOf: [
              {
                type: "object",
                properties: {
                  label: { type: "string" },
                  kind: { type: "string", enum: [...THEME_KINDS] },
                  store_theme: { type: "string" },
                },
                required: ["label", "kind", "store_theme"],
                additionalProperties: false,
              },
              { type: "null" },
            ],
          },
        },
        required: ["question_id", "theme_id", "new_theme"],
        additionalProperties: false,
      },
    },
  },
  required: ["assignments"],
  additionalProperties: false,
} as const;

const INSTRUCTIONS = `You group shoppers' questions about one product so the store can see what people ask.
For each question, either reuse an existing product theme that asks the same thing (theme_id), or create a new one (new_theme, with theme_id null).
- A product theme is one short, plain question that covers every question in it, e.g. "Does it run small?".
- Put the new theme under a broad store-wide theme (store_theme), reusing an existing store-wide theme's exact name when it fits, e.g. "Sizing", "Materials", "Care", "Comparisons", "Store policies".
- Questions asking the same thing in different words or languages belong together. Don't merge different questions.
Return one assignment per question.`;

export async function classifyQuestions(input: ClassifyInput): Promise<ClassifyOutput> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: GROUPING_MODEL,
    max_tokens: 2048,
    system: INSTRUCTIONS,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{
      role: "user",
      content: JSON.stringify({
        product: input.productTitle,
        existing_product_themes: input.productThemes,
        existing_store_themes: input.storeThemes,
        questions: input.questions,
      }),
    }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming);
  const text = res.content.find((b) => b.type === "text");
  return JSON.parse(text && text.type === "text" ? text.text : '{"assignments":[]}') as ClassifyOutput;
}
