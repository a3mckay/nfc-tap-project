"use server";

import Anthropic from "@anthropic-ai/sdk";

export interface BrandSuggestion {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  font: string;
  description: string;
}

const FONT_OPTIONS = [
  "system-ui, sans-serif",
  "Inter, system-ui, sans-serif",
  "Georgia, serif",
  "'Helvetica Neue', Arial, sans-serif",
  "'Playfair Display', Georgia, serif",
];

export async function detectBrandAction(
  url: string,
): Promise<{ result?: BrandSuggestion; error?: string }> {
  // Step 1 — screenshot via Microlink (free, no API key, real headless browser)
  let screenshotUrl: string;
  try {
    const res = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=false`,
      { signal: AbortSignal.timeout(30_000) },
    );
    const data = await res.json() as { status: string; data?: { screenshot?: { url: string } } };
    if (data.status !== "success" || !data.data?.screenshot?.url) {
      return { error: "Couldn't capture a screenshot. Check the URL is correct and publicly accessible." };
    }
    screenshotUrl = data.data.screenshot.url;
  } catch {
    return { error: "Screenshot timed out — the site may be blocking automated requests." };
  }

  // Step 2 — Claude Vision: identify brand palette and font
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    tools: [
      {
        name: "suggest_brand_palette",
        description: "Return the brand's colour palette and closest matching font based on the website screenshot.",
        input_schema: {
          type: "object" as const,
          properties: {
            primary: {
              type: "string",
              description: "The dominant foreground brand colour as a hex code — used for headings, logos, CTAs, or key interactive elements. Must have strong contrast against the background colour.",
            },
            secondary: {
              type: "string",
              description: "A complementary supporting colour as a hex code — used for subheadings, prices, or secondary UI elements.",
            },
            tertiary: {
              type: "string",
              description: "An accent or highlight colour as a hex code — used for badges, tags, hover states, or decorative elements.",
            },
            background: {
              type: "string",
              description: "The dominant page background colour as a hex code. Usually white or a very light tint of the brand's palette.",
            },
            font: {
              type: "string",
              enum: FONT_OPTIONS,
              description: "The closest matching font from the provided list based on the brand's typography style.",
            },
            description: {
              type: "string",
              description: "One sentence describing the brand's visual aesthetic.",
            },
          },
          required: ["primary", "secondary", "tertiary", "background", "font", "description"],
        },
      },
    ],
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: screenshotUrl },
          },
          {
            type: "text",
            text: "Analyse this website screenshot and identify the brand's colour palette and typography. The primary colour should be the strongest foreground colour with good contrast (used on headings, CTAs, logo). The background should be the actual page background. Focus on intentional brand choices — not generic greys.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { error: "Couldn't extract brand colours. Try again." };
  }

  return { result: toolUse.input as BrandSuggestion };
}
