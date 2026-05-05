import Anthropic from "@anthropic-ai/sdk";
import type { Pool } from "pg";
import {
  getProductsWithoutEnrichment,
  insertEnrichment,
  type ProductForEnrichment,
} from "@nfc/db";

const SYSTEM_PROMPT = `You are an expert retail copywriter for independent boutiques.
Given a product's basic details, generate compelling, authentic product copy that helps in-store shoppers understand what makes the product special.

Keep the tone warm, knowledgeable, and honest — never hyperbolic. Write for someone holding the product in their hands.`;

const WRITE_COPY_TOOL: Anthropic.Tool = {
  name: "write_product_copy",
  description: "Write structured product copy fields for a retail product.",
  input_schema: {
    type: "object",
    properties: {
      backstory: {
        type: ["string", "null"],
        description:
          "1-2 sentences on the brand's origin or the product's design story. Null if not enough info.",
      },
      fit_notes: {
        type: ["string", "null"],
        description:
          "1-2 sentences on sizing, fit, or how to wear it. Null if not applicable (e.g. homeware).",
      },
      materials: {
        type: ["string", "null"],
        description:
          "1 sentence listing key materials or construction details. Null if unknown.",
      },
      reasons_to_buy: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4,
        description: "2-4 short bullet-point reasons to buy this product.",
      },
    },
    required: ["backstory", "fit_notes", "materials", "reasons_to_buy"],
  },
};

export interface CopyFields {
  backstory: string | null;
  fit_notes: string | null;
  materials: string | null;
  reasons_to_buy: string[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildCopyPrompt(product: ProductForEnrichment): string {
  const lines: string[] = [`Product: ${product.title}`];
  if (product.vendor) lines.push(`Brand: ${product.vendor}`);
  if (product.product_type) lines.push(`Category: ${product.product_type}`);
  if (product.description_html) {
    const plain = stripHtml(product.description_html);
    if (plain) lines.push(`Description: ${plain}`);
  }
  lines.push(
    "\nWrite product copy for this item using the write_product_copy tool.",
  );
  return lines.join("\n");
}

export function parseCopyResponse(toolInput: Record<string, unknown>): CopyFields {
  return {
    backstory: (toolInput["backstory"] as string | null) ?? null,
    fit_notes: (toolInput["fit_notes"] as string | null) ?? null,
    materials: (toolInput["materials"] as string | null) ?? null,
    reasons_to_buy: Array.isArray(toolInput["reasons_to_buy"])
      ? (toolInput["reasons_to_buy"] as string[])
      : [],
  };
}

async function generateCopyForProduct(
  client: Anthropic,
  product: ProductForEnrichment,
): Promise<CopyFields> {
  const stream = await client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [WRITE_COPY_TOOL],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: buildCopyPrompt(product) }],
  });

  const response = await stream.finalMessage();

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "write_product_copy") {
      return parseCopyResponse(block.input as Record<string, unknown>);
    }
  }

  throw new Error(`No tool call in response for product ${product.id}`);
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;

async function processBatch(
  client: Anthropic,
  pool: Pool,
  batch: ProductForEnrichment[],
): Promise<void> {
  await Promise.all(
    batch.map(async (product) => {
      try {
        const copy = await generateCopyForProduct(client, product);
        await insertEnrichment(pool, {
          product_id: product.id,
          ...copy,
          ai_generated: true,
        });
        console.log(`[copy] enriched: ${product.title} (${product.id})`);
      } catch (err) {
        console.error(`[copy] failed: ${product.title} (${product.id})`, err);
      }
    }),
  );
}

export async function runCopyGenerationJob(
  pool: Pool,
  client: Anthropic,
  storeId: string,
): Promise<void> {
  const products = await getProductsWithoutEnrichment(pool, storeId);
  if (products.length === 0) return;

  console.log(`[copy] ${products.length} product(s) need enrichment for store ${storeId}`);

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await processBatch(client, pool, batch);
    if (i + BATCH_SIZE < products.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`[copy] done for store ${storeId}`);
}
