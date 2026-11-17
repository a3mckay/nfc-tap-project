// "Goes great with" (founder, 2026-11-16): the AI picks up to three of the
// store's own live products that a product needs or suits. Its source of
// knowledge is the product's fact sheet (brand, plant references, the owner's
// notes): every pick cites a numbered fact, and the reason is that fact's need.
// The model is injected, so this has no network access of its own.
import Anthropic from "@anthropic-ai/sdk";
import { MAX_PAIRINGS, canPair, type CatalogItem, type FactSourceKind, type NewPairing, type SpecCategory } from "@nfc/db";

export interface PairingFact {
  topic: string;
  fact: string;
  source_url: string | null;
  source_kind: FactSourceKind;
}

export interface PairingInput {
  product: { id: string; title: string; category: SpecCategory };
  facts: PairingFact[];
  catalog: CatalogItem[];
}

export type PairingModel = (prompt: string) => Promise<unknown[]>;

export { canPair };


const candidates = (catalog: CatalogItem[]) => catalog.filter((c) => canPair(c.category));

export function pairingPrompt({ product, facts, catalog }: PairingInput): string {
  const items = candidates(catalog);
  return `Product: ${product.title} (${product.category})

Numbered facts about it, each from a source:
${facts.map((f, i) => `[${i + 1}] (${f.topic}) ${f.fact}`).join("\n")}

The store's other products (the catalog):
${items.map((c, i) => `c${i + 1}: ${c.title}${c.product_type ? ` [${c.product_type}]` : ""}${c.description ? ` — ${c.description}` : ""}`).join("\n")}

Pick up to ${MAX_PAIRINGS} catalog products a customer buying this product would genuinely need or use with it.
Rules:
- Pick only from the catalog above, by its key (c1, c2…).
- Every pick must rest on one numbered fact that states the need (for example a pest it gets, how it's watered, what it's fed). Cite that fact's number. No fact, no pick.
- The catalog product must plainly meet that need from its own title or description. Don't assume it does more than it says.
- The reason is shown to customers: one short, plain sentence stating the need from the fact (e.g. "Bromeliads can get mealybugs and scale."). Don't describe what the catalog product does, don't call anything safe, and don't urge buying.
- Never pick another version of the same product (a different size or colour of the same plant).
- Picking none is fine, and better than a weak pick.`;
}

export function pairingsFromModel(raw: unknown[], { facts, catalog }: PairingInput): NewPairing[] {
  const items = candidates(catalog);
  const out: NewPairing[] = [];
  for (const r of raw) {
    if (out.length >= MAX_PAIRINGS || typeof r !== "object" || r === null) continue;
    const { item, fact, reason } = r as { item?: unknown; fact?: unknown; reason?: unknown };
    const product = typeof item === "string" && /^c\d+$/.test(item) ? items[Number(item.slice(1)) - 1] : undefined;
    const source = typeof fact === "number" ? facts[fact - 1] : undefined;
    const text = typeof reason === "string" ? reason.trim() : "";
    if (!product || !source || !text || out.some((p) => p.paired_product_id === product.id)) continue;
    out.push({ paired_product_id: product.id, reason: text.slice(0, 200), source_url: source.source_url, source_kind: source.source_kind });
  }
  return out;
}

export async function suggestPairings(input: PairingInput, model: PairingModel): Promise<NewPairing[]> {
  if (!canPair(input.product.category) || input.facts.length === 0 || candidates(input.catalog).length === 0) return [];
  return pairingsFromModel(await model(pairingPrompt(input)), input);
}

// The production model: Claude Sonnet 5.5 with a structured tool answer.
export async function askForPairings(prompt: string): Promise<unknown[]> {
  const res = await new Anthropic().messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 800,
    tools: [{
      name: "submit_pairings",
      description: "Submit the catalog products that go with this product. An empty list is fine.",
      input_schema: {
        type: "object" as const,
        properties: {
          pairings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string", description: "The catalog key, e.g. c3" },
                fact: { type: "integer", description: "The number of the fact that states the need" },
                reason: { type: "string", description: "One short customer-facing sentence stating the need from that fact" },
              },
              required: ["item", "fact", "reason"],
            },
          },
        },
        required: ["pairings"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_pairings" },
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  const pairings = (block?.input as { pairings?: unknown } | undefined)?.pairings;
  return Array.isArray(pairings) ? pairings : [];
}
