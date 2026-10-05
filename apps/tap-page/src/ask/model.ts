// PRD v4 §7 Step 15c: the model call. Claude Haiku 4.5 is the founder's
// value-first choice for answers (docs/PRD-ai-assistant.md D16); step up to
// Sonnet 5.5 for this route only if it fails the quality test set (Step 15d).
// The rules and the product context are marked for prompt caching.
import Anthropic from "@anthropic-ai/sdk";
import type { ModelMessage } from "./handle.js";

export const ANSWER_MODEL = "claude-haiku-4-5";

export async function* streamAnswer(
  system: { rules: string; context: string },
  messages: ModelMessage[],
  onUsage?: (usage: Anthropic.Usage) => void,   // the quality test set's cost report
): AsyncIterable<string> {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: ANSWER_MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: system.rules, cache_control: { type: "ephemeral" } },
      { type: "text", text: system.context, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  if (onUsage) onUsage((await stream.finalMessage()).usage);
}
