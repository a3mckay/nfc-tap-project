// "Goes great with" (founder, 2026-11-16): the product editor shows the AI's
// pairings with their reasons and sources, with Remove and "Find again".
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../app/enrichment/[product_id]/pairingActions.js", () => ({ removePairingAction: vi.fn(), findPairingsAction: vi.fn() }));
const { PairingsPanel } = await import("../app/enrichment/[product_id]/PairingsPanel.js");

const soap = { product_id: "soap", title: "Safer's Insecticidal Soap", image_url: null, tag_uuid: "t-1", reason: "Bromeliads can get mealybugs.", source_url: "https://plants.ces.ncsu.edu/plants/x/", source_kind: "reference" as const };

describe("PairingsPanel", () => {
  it("lists each pairing with its reason, source and a Remove button", () => {
    const html = renderToStaticMarkup(<PairingsPanel shop="s" productId="p-1" pairings={[soap]} allowed />);
    expect(html).toContain("Goes great with");
    expect(html).toContain("Safer&#x27;s Insecticidal Soap");
    expect(html).toContain("Bromeliads can get mealybugs.");
    expect(html).toContain("plants.ces.ncsu.edu");
    expect(html).toContain("Remove");
    expect(html).toContain("Find again");
  });

  it("explains an empty list, and says why cannabis and alcohol have none", () => {
    expect(renderToStaticMarkup(<PairingsPanel shop="s" productId="p-1" pairings={[]} allowed />)).toMatch(/None yet/);
    const blocked = renderToStaticMarkup(<PairingsPanel shop="s" productId="p-1" pairings={[]} allowed={false} />);
    expect(blocked).toMatch(/cannabis and alcohol/);
    expect(blocked).not.toContain("Find again");
  });
});
