// PRD v4 §7 Step 15e: the customer-facing Ask experience on the tap page
// (docs/PRD-ai-assistant.md §3.A; D3, D4, D21, D23, D28, D29, D30, D37).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NdjsonReader, suggestedQuestions, piiNotice, keyPoints, DISCLOSURE } from "@/ask/client.js";
import { KeyPoints } from "../app/p/[tag_uuid]/KeyPoints.js";
import { AskBar, ChatHeader } from "../app/p/[tag_uuid]/AskBar.js";

describe("NdjsonReader", () => {
  it("returns complete events and keeps a partial line until the rest arrives", () => {
    const r = new NdjsonReader();
    expect(r.push('{"type":"delta","text":"Hi"}\n{"type":"del')).toEqual([{ type: "delta", text: "Hi" }]);
    expect(r.push('ta","text":" there"}\n')).toEqual([{ type: "delta", text: " there" }]);
    expect(r.push("not json\n")).toEqual([]);
  });
});

describe("suggestedQuestions", () => {
  it("uses the product's FAQ questions first, up to three", () => {
    expect(suggestedQuestions([{ question: "Is it sleeveless?", answer: "" }, { question: "Will it be hot?", answer: "" }, { question: "How should I size it?", answer: "" }, { question: "x", answer: "" }]))
      .toEqual(["Is it sleeveless?", "Will it be hot?", "How should I size it?"]);
  });

  it("falls back to general product questions", () => {
    expect(suggestedQuestions([])).toEqual(["What's it made of?", "How does it fit?", "How do I care for it?"]);
  });
});

describe("piiNotice (D30)", () => {
  it("names what was removed", () => {
    expect(piiNotice(["phone"])).toBe("We removed a phone number from your message to keep it private.");
    expect(piiNotice(["email", "card"])).toBe("We removed an email address and a card number from your message to keep it private.");
    expect(piiNotice([])).toBeNull();
  });
});

describe("keyPoints (D21)", () => {
  it("uses Great when… and falls back to the first three reasons to buy", () => {
    expect(keyPoints(["you sleep hot"], ["a", "b"])).toEqual({ title: "Great when…", points: ["you sleep hot"] });
    expect(keyPoints([], ["a", "b", "c", "d"])).toEqual({ title: "Why we love it", points: ["a", "b", "c"] });
    expect(keyPoints([], [])).toBeNull();
  });
});

describe("KeyPoints", () => {
  it("renders the points under their heading", () => {
    const html = renderToStaticMarkup(<KeyPoints greatWhen={["you sleep hot", "you like a lived-in look"]} reasonsToBuy={[]} primaryColor="#123456" />);
    expect(html).toContain("Great when…");
    expect(html).toContain("you sleep hot");
    expect(html).toContain("you like a lived-in look");
  });

  it("marks points with a brand-colour dot, keeping ✦ for the AI's Ask bar", () => {
    const html = renderToStaticMarkup(<KeyPoints greatWhen={["you sleep hot"]} reasonsToBuy={[]} primaryColor="#123456" />);
    expect(html).not.toContain("✦");
    expect(html).toMatch(/aria-hidden="true"[^>]*background:#123456[^>]*border-radius:50%/);
  });
});

describe("AskBar", () => {
  it("starts as a full-width bar inviting a question, with the AI disclosure", () => {
    const html = renderToStaticMarkup(<AskBar tagUuid="abc" productTitle="Weekend Chukka" storeName="Queen West Shoes" primaryColor="#000" suggestions={["Does it run small?"]} />);
    expect(html).toContain("Ask about this");
    expect(html).toContain("position:fixed");
    expect(DISCLOSURE("Queen West Shoes")).toBe("Answers are AI-generated. Questions are saved anonymously to help Queen West Shoes improve.");
  });
});

describe("StaffShell: Customers are asking (D13, Step 15h)", async () => {
  const { StaffShell } = await import("../app/p/[tag_uuid]/StaffShell.js");
  const product = { id: "p", title: "Weekend Chukka", vendor: "Northfield", images: [], variants: [] } as never;
  const render = (asking: Array<{ label: string; count: number; answer: string | null }>, total: number) => renderToStaticMarkup(
    <StaffShell product={product} storeName="Queen West Shoes" primaryColor="#000" hasOwnerNotes stockNoteAge={null} tagUuid="abc"
      sections={[{ title: "The one-line sell", kind: "text", text: "One boot, office to bar." }, { title: "Who it's for", kind: "text", text: "Everyone" }]}
      customersAsking={asking} totalQuestions={total} />,
  );

  it("shows the top themes with counts right after the one-line sell, and the staff Ask bar", () => {
    const html = render([{ label: "Does it run small?", count: 14, answer: "True to size." }], 20);
    expect(html.indexOf("One boot, office to bar.")).toBeLessThan(html.indexOf("Customers are asking"));
    expect(html.indexOf("Customers are asking")).toBeLessThan(html.indexOf("Who it&#x27;s for"));
    expect(html).toContain("20 questions so far");
    expect(html).toContain("Does it run small?");
    expect(html).toContain("14");
    expect(html).toContain("True to size.");
    expect(html).toContain("Ask about this");
  });

  it("hides the section until there's a question", () => {
    expect(render([], 0)).not.toContain("Customers are asking");
  });
});

describe("sheetPosition: the chat stays above the on-screen keyboard", async () => {
  const { sheetPosition } = await import("@/ask/client.js");
  const view = (height: number, offsetTop = 0) => ({ height, offsetTop });

  it("sits at the bottom at its normal height when there's no keyboard", () => {
    expect(sheetPosition(800, null, false, false)).toEqual({ bottom: 0, height: "60vh" });
    expect(sheetPosition(800, view(800), true, false)).toEqual({ bottom: 0, height: "92vh" });
  });

  it("ignores small differences such as a browser toolbar sliding away", () => {
    expect(sheetPosition(800, view(740), false, false)).toEqual({ bottom: 0, height: "60vh" });
  });

  it("Android: the page already shrinks above the keyboard, so while typing it fills the space left", () => {
    expect(sheetPosition(420, view(420), false, true)).toEqual({ bottom: 0, height: "386px" });
  });

  it("lifts above a keyboard the page doesn't shrink for, and fills most of the space left", () => {
    expect(sheetPosition(800, view(420), false, false)).toEqual({ bottom: 380, height: "386px" });
  });

  it("iPhone: allows for the page being panned while the keyboard is up", () => {
    expect(sheetPosition(800, view(420, 100), true, true)).toEqual({ bottom: 280, height: "386px" });
  });
});

describe("ChatHeader", () => {
  const html = renderToStaticMarkup(<ChatHeader productTitle="Air Force 1" primaryColor="#000" onMinimize={() => {}} />);

  it("has one Minimize button with its chevron beside the word and a full-size tap target", () => {
    expect(html).toMatch(/<button[^>]*aria-label="Minimize chat"[^>]*min-height:44px[^>]*><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>Minimize<\/button>/);
  });

  it("has no separate expand arrow: the sheet grows once the conversation starts", () => {
    expect(html).not.toContain("Expand chat");
    expect(html).not.toContain("▴");
  });
});

describe("viewport", () => {
  it("asks Android browsers to shrink the page above the keyboard (iPhones ignore it)", async () => {
    const { viewport } = await import("../app/layout.js");
    expect(viewport).toMatchObject({ width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" });
  });
});
