import Anthropic from "@anthropic-ai/sdk";
import type { SearchResult } from "./search.js";

// Claude reads search results and extracts structured review/award/press data.
// Returns only items it's confident about — discards generic listicles, comparison sites,
// or results that don't actually contain a review.

export interface ExtractedReview {
  type: "review" | "award" | "press";
  source_name: string;          // e.g. "Vogue", "Trustpilot user", "John D."
  source_url: string;
  excerpt: string;              // short quoted excerpt or summary, max ~200 chars
  rating: number | null;        // 0-5 if a rating is present
  award_title: string | null;   // for type=award
  awarding_body: string | null; // for type=award
  year: number | null;
  date: string | null;          // ISO date if found
}

export interface ExtractionResult {
  items: ExtractedReview[];
}

export async function extractReviewsFromResults(
  productTitle: string,
  productVendor: string | null,
  results: SearchResult[],
): Promise<ExtractedReview[]> {
  if (results.length === 0) return [];

  const client = new Anthropic();

  const resultsText = results.map((r, i) =>
    `[${i + 1}] ${r.title}\n   URL: ${r.url}\n   ${r.description}`
  ).join("\n\n");

  const productLabel = productVendor ? `${productVendor} ${productTitle}` : productTitle;

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    tools: [
      {
        name: "submit_extracted_items",
        description: "Submit any reviews, awards, or press mentions found in the search results.",
        input_schema: {
          type: "object" as const,
          properties: {
            items: {
              type: "array",
              description: "List of high-confidence reviews/awards/press. Empty array if nothing relevant found.",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["review", "award", "press"],
                    description: "review = customer/critic review with opinion; award = wins/recognition; press = media mention/feature",
                  },
                  source_name: { type: "string", description: "Publication or reviewer name (e.g. 'Vogue', 'Trustpilot user')" },
                  source_url: { type: "string", description: "URL of the source result" },
                  excerpt: { type: "string", description: "Short quotation or summary, max 200 chars" },
                  rating: { type: ["number", "null"], description: "0-5 if a star rating is mentioned, otherwise null" },
                  award_title: { type: ["string", "null"], description: "Award name if type=award" },
                  awarding_body: { type: ["string", "null"], description: "Body giving the award if type=award" },
                  year: { type: ["integer", "null"], description: "Year if mentioned" },
                  date: { type: ["string", "null"], description: "ISO date if found" },
                },
                required: ["type", "source_name", "source_url", "excerpt", "rating", "award_title", "awarding_body", "year", "date"],
              },
            },
          },
          required: ["items"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_extracted_items" },
    messages: [
      {
        role: "user",
        content: `Below are web search results for the product "${productLabel}". Identify which results contain genuine reviews, awards, or press mentions of this specific product (not just listicles, comparison pages, or generic mentions).

Be strict:
- Only include items where the source actually reviews/discusses THIS product
- Reject affiliate roundups ("10 best X"), generic comparison sites, retailer product pages
- Each excerpt should be a brief representative quote or summary, not the full description
- If nothing relevant, return an empty items array

Search results:

${resultsText}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return [];

  const result = toolUse.input as ExtractionResult;
  return result.items ?? [];
}
