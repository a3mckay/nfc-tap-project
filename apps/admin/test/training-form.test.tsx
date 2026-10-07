// The staff training form uses the product's category's words
// (docs/category-labels.md; founder: never footwear labels on a wine).
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../app/enrichment/[product_id]/trainingActions.js", () => ({}));
const { TrainingForm } = await import("../app/enrichment/[product_id]/TrainingForm.js");
const { copyFor } = await import("@nfc/db");

const initial = {
  one_line_sell: "", who_its_for: "", who_its_not_for: "", fit_and_sizing: "", worth_the_price: ["", "", ""],
  closest_alternative: "", common_questions: [{ question: "", answer: "" }], companion_products: "", brand_context: "", stock_note: "",
};
const render = (category: Parameters<typeof copyFor>[0]) => renderToStaticMarkup(
  <TrainingForm shop="s" productId="p" initial={initial} stockNoteUpdatedAt={null} aiAvailable={false} trainingCopy={copyFor(category).training} />,
);

describe("TrainingForm", () => {
  it("uses wine's words for a wine", () => {
    const html = render("wine");
    expect(html).toContain("Style and serving truth");
    expect(html).toContain("Does it need decanting?");
    expect(html).toContain("Two cases left of the 2020");
    expect(html).not.toMatch(/Fit and sizing|Air unit|crease|Size 9|merino|shoe/i);
  });

  it("keeps the shoe examples for footwear", () => {
    const html = render("footwear");
    expect(html).toContain("Fit and sizing truth");
    expect(html).toContain("Does this crease?");
  });
});
