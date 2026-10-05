// PRD v4 §7 Step 15b: "Generate" researches the product brand-first, saves a
// fact sheet with a source for every fact, and drafts "Great when…" key points
// (docs/PRD-ai-assistant.md §6.2, D21, D41, D42).
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  getProductById: vi.fn(),
  upsertFullEnrichment: vi.fn(async () => {}),
  updateManualProduct: vi.fn(async () => {}),
  getBrandWebsite: vi.fn(async (): Promise<{ website: string; confirmed: boolean } | null> => null),
  setBrandWebsite: vi.fn(async () => {}),
  replaceResearchedFacts: vi.fn(async () => true),
  saveReviewFlags: vi.fn(async () => {}),
}));
const checkProductNotes = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/check-product.js", () => ({ checkProductNotes }));
const getActionStore = vi.hoisted(() => vi.fn(async () => ({ id: "store-1", shopify_shop_domain: "own.myshopify.com" })));
const braveSearch = vi.hoisted(() => vi.fn());
const fetchPageText = vi.hoisted(() => vi.fn(async () => "Full-grain suede upper. Made in Portugal."));
const create = vi.hoisted(() => vi.fn());

vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/public-reviews/search.js", () => ({ braveSearch }));
vi.mock("@/lib/product-research.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/product-research.js")>()),
  fetchPageText,
}));
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn(() => ({ messages: { create } })) }));

const { generateEnrichmentAction, saveEnrichmentAction } = await import("../app/enrichment/[product_id]/actions.js");

const hit = (url: string, title: string, description: string) => ({ url, title, description });

const modelOutput = (extra: Record<string, unknown> = {}) => ({
  content: [{
    type: "tool_use",
    input: {
      backstory: "b", materials: "m", fit_notes: "f", care_instructions: "c", sustainability_notes: "",
      reasons_to_buy: ["r1"], staff_quote: "q", video_url: "", faq: [],
      great_when: ["you want one boot from office to bar", "it's wet but not snowing", "you hate break-in", "a fourth"],
      facts: [
        { topic: "materials", fact: "Full-grain suede upper", source: 1 },
        { topic: "origin", fact: "Made in Portugal", source: 1 },
        { topic: "fit", fact: "Made up claim", source: 7 },
      ],
      mismatches: ["One source describes the mid-top, not this low-top."],
      ...extra,
    },
  }],
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test";
  process.env.BRAVE_SEARCH_API_KEY = "test";
  db.getProductById.mockResolvedValue({ id: "p-1", store_id: "store-1", title: "Weekend Chukka", vendor: "Northfield", product_type: "Boots", description_html: null });
  braveSearch.mockImplementation(async (q: string) => {
    if (q === "Northfield official site") return [hit("https://www.northfield.com/", "Northfield", "")];
    if (q.startsWith("site:northfield.com")) return [hit("https://northfield.com/chukka", "Weekend Chukka | Northfield", "brand snippet")];
    if (q.includes("site:youtube.com")) return [];
    return [hit("https://www.nordstrom.com/chukka", "Northfield Weekend Chukka", "retail snippet")];
  });
  create.mockResolvedValue(modelOutput());
});

describe("generateEnrichmentAction research", () => {
  it("finds the brand's site, remembers it unconfirmed, and searches it first", async () => {
    await generateEnrichmentAction("own.myshopify.com", "p-1");
    expect(db.setBrandWebsite).toHaveBeenCalledWith(expect.anything(), "store-1", "Northfield", "https://northfield.com", false);
    expect(braveSearch).toHaveBeenCalledWith("site:northfield.com Weekend Chukka", 3);
    expect(fetchPageText).toHaveBeenCalledWith("https://northfield.com/chukka");
    const prompt = JSON.stringify(create.mock.calls[0]![0].messages);
    expect(prompt).toContain("[1] (brand)");
    expect(prompt).toContain("Made in Portugal");
  });

  it("uses a known brand website without searching for it", async () => {
    db.getBrandWebsite.mockResolvedValue({ website: "https://northfield.com", confirmed: true });
    await generateEnrichmentAction("own.myshopify.com", "p-1");
    expect(braveSearch).not.toHaveBeenCalledWith("Northfield official site", 5);
    expect(db.setBrandWebsite).not.toHaveBeenCalled();
  });

  it("saves sourced facts and drops unsourced ones", async () => {
    await generateEnrichmentAction("own.myshopify.com", "p-1");
    expect(db.replaceResearchedFacts).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", [
      { topic: "materials", fact: "Full-grain suede upper", source_url: "https://northfield.com/chukka", source_kind: "brand" },
      { topic: "origin", fact: "Made in Portugal", source_url: "https://northfield.com/chukka", source_kind: "brand" },
    ]);
  });

  it("saves up to three Great when… key points", async () => {
    const { draft } = await generateEnrichmentAction("own.myshopify.com", "p-1");
    expect(draft?.great_when).toHaveLength(3);
    expect(db.upsertFullEnrichment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      great_when: ["you want one boot from office to bar", "it's wet but not snowing", "you hate break-in"],
    }));
  });

  it("leaves the existing fact sheet alone when there's no web research", async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    await generateEnrichmentAction("own.myshopify.com", "p-1");
    expect(braveSearch).not.toHaveBeenCalled();
    expect(db.replaceResearchedFacts).not.toHaveBeenCalled();
  });
});

describe("checks after Generate (Step 15k)", () => {
  it("saves research findings that don't fit the product, and re-checks the notes", async () => {
    await generateEnrichmentAction("own.myshopify.com", "p-1");
    expect(db.saveReviewFlags).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", "mismatch", ["One source describes the mid-top, not this low-top."]);
    expect(checkProductNotes).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1");
  });
});

describe("saveEnrichmentAction", () => {
  it("saves Great when… one per line, at most three", async () => {
    await saveEnrichmentAction({
      shop: "own.myshopify.com", product_id: "p-1", is_manual: false, product_title: "", primary_image_url: "",
      backstory: "", fit_notes: "", materials: "", care_instructions: "", sustainability_notes: "",
      reasons_to_buy_text: "", staff_quote: "", staff_name: "", staff_photo_url: "", video_url: "",
      extra_images_text: "", reviews: [], awards_text: "", faq: [], internal_staff_notes: "",
      great_when_text: "one\n\ntwo\nthree\nfour",
    });
    expect(db.upsertFullEnrichment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ great_when: ["one", "two", "three"] }));
    expect(checkProductNotes).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1");
  });
});
