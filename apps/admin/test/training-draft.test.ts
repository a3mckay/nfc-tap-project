// The AI draft request: current model, structured output, stock note never drafted.
import { describe, it, expect, vi } from "vitest";
import { draftTraining, TRAINING_DRAFT_MODEL } from "../src/lib/training-draft.js";

const context = {
  title: "Trail Runner", vendor: "Acme", productType: "Shoes", description: "Light and grippy.",
  existingCopy: { fit_notes: "True to size", backstory: null, materials: "Mesh", reasons_to_buy: ["Grippy"], faq: [] },
  otherProducts: ["Road Runner", "Merino Socks"],
};
const parsed = {
  one_line_sell: "x", who_its_for: "", who_its_not_for: "", fit_and_sizing: "", worth_the_price: [],
  closest_alternative: "", common_questions: [], companion_products: "", brand_context: "",
};

function fakeClient(response: object) {
  const parse = vi.fn(async (_params: Record<string, unknown>) => response);
  return { client: { messages: { parse } } as never, parse };
}

describe("draftTraining", () => {
  it("asks the current model for structured output that includes the store's other products", async () => {
    const { client, parse } = fakeClient({ stop_reason: "end_turn", parsed_output: parsed });
    expect(await draftTraining(client, context)).toEqual(parsed);
    const params = parse.mock.calls[0]![0];
    expect(params.model).toBe(TRAINING_DRAFT_MODEL);
    expect(TRAINING_DRAFT_MODEL).toBe("claude-opus-5-5");
    expect(params).not.toHaveProperty("tool_choice");
    expect(JSON.stringify(params.messages)).toContain("Road Runner");
    const schema = JSON.stringify((params.output_config as { format: unknown }).format);
    expect(schema).not.toContain("stock_note");
  });

  it("throws on a refusal", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", parsed_output: null });
    await expect(draftTraining(client, context)).rejects.toThrow(/declined/);
  });

  it("throws when the output can't be parsed", async () => {
    const { client } = fakeClient({ stop_reason: "max_tokens", parsed_output: null });
    await expect(draftTraining(client, context)).rejects.toThrow();
  });
});
