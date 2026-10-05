// PRD v4 §7 Step 15c: the model call. Claude Haiku 4.5 is the founder's
// value-first default (docs/PRD-ai-assistant.md D16); the quality test set can
// compare another model with ASK_MODEL (e.g. claude-sonnet-5-5), and D16 says to
// step up to Sonnet 5.5 for this route if Haiku can't meet the bar.
// The rules and the product context are marked for prompt caching.
import Anthropic from "@anthropic-ai/sdk";
import type { ModelMessage } from "./handle.js";

export const DEFAULT_ANSWER_MODEL = "claude-haiku-4-5";

export function answerModel(env: Record<string, string | undefined> = process.env): string {
  return env.ASK_MODEL || DEFAULT_ANSWER_MODEL;
}

// Short answers on a phone: Sonnet 5.5 runs at low effort with thinking off
// (`between_tools` is how Sonnet 5.5 turns thinking off), so the first word
// arrives quickly. Haiku 4.5 has no thinking by default.
export function requestOptions(model: string): Record<string, unknown> {
  if (model.startsWith("claude-sonnet-5-5")) return { thinking: { type: "between_tools" }, output_config: { effort: "low" } };
  return {};
}

export async function* streamAnswer(
  system: { rules: string; context: string },
  messages: ModelMessage[],
  onUsage?: (model: string, usage: Anthropic.Usage) => void,   // the quality test set's cost report
): AsyncIterable<string> {
  const client = new Anthropic();
  const model = answerModel();
  const stream = client.messages.stream({
    model,
    max_tokens: 1024,
    system: [
      { type: "text", text: system.rules, cache_control: { type: "ephemeral" } },
      { type: "text", text: system.context, cache_control: { type: "ephemeral" } },
    ],
    messages,
    ...requestOptions(model),
  } as Anthropic.MessageStreamParams);
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  if (onUsage) onUsage(model, (await stream.finalMessage()).usage);
}
