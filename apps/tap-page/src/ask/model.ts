// PRD v4 §7 Step 15c: the model call. Claude Sonnet 5.5 answers: Haiku 4.5, the
// founder's value-first first choice, missed the quality bar (about 75% vs
// Sonnet's 95%), so D16's step-up applies (docs/PRD-ai-assistant.md D52).
// ASK_MODEL overrides it, e.g. to compare models with the quality test set.
// The rules and the product context are marked for prompt caching.
import Anthropic from "@anthropic-ai/sdk";
import type { ModelMessage } from "./handle.js";

export const DEFAULT_ANSWER_MODEL = "claude-sonnet-5-5";

export function answerModel(env: Record<string, string | undefined> = process.env): string {
  return env.ASK_MODEL || DEFAULT_ANSWER_MODEL;
}

// Short answers on a phone: Sonnet 5.5 runs at low effort with thinking off
// (`between_tools` is how Sonnet 5.5 turns thinking off), so the first word
// arrives quickly (median about 1.1 s in the test set). If a request is declined
// by a safety classifier, the API retries it on a fallback model ("default").
export function requestOptions(model: string): Record<string, unknown> {
  if (model.startsWith("claude-sonnet-5-5")) {
    return {
      thinking: { type: "between_tools" },
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    };
  }
  return {};
}

export async function* streamAnswer(
  system: { rules: string; context: string },
  messages: ModelMessage[],
  onUsage?: (model: string, usage: Anthropic.Beta.BetaUsage) => void,   // the quality test set's cost report
): AsyncIterable<string> {
  const client = new Anthropic();
  const model = answerModel();
  const stream = client.beta.messages.stream({
    model,
    max_tokens: 1024,
    system: [
      { type: "text", text: system.rules, cache_control: { type: "ephemeral" } },
      { type: "text", text: system.context, cache_control: { type: "ephemeral" } },
    ],
    messages,
    ...requestOptions(model),
  } as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  if (onUsage) onUsage(model, (await stream.finalMessage()).usage);
}
