// PRD v4 §7 Step 13d: the sticky Training | Customer switch shown to staff.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffViewToggle } from "../app/p/[tag_uuid]/StaffViewToggle.js";

const render = (current: "training" | "preview") =>
  renderToStaticMarkup(<StaffViewToggle current={current} tagUuid="abc" storeName="Demo Boutique" />);

describe("StaffViewToggle", () => {
  it("links both options and marks the training view as current", () => {
    const html = render("training");
    expect(html).toContain('href="/p/abc"');
    expect(html).toContain('href="/p/abc?view=customer"');
    expect(html).toMatch(/aria-current="page"[^>]*>Training</);
    expect(html).toContain("Demo Boutique");
    expect(html).toContain("position:sticky");
  });

  it("marks the customer view as current in the preview, with a note that it's a preview", () => {
    const html = render("preview");
    expect(html).toMatch(/aria-current="page"[^>]*>Customer</);
    expect(html).toContain("Customer preview · reactions and sign-ups off");
  });
});
