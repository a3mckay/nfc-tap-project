// PRD v4 §7 Step 15e: the customer-facing Ask experience on the tap page
// (docs/PRD-ai-assistant.md §3.A; D3, D4, D21, D23, D28, D29, D30, D37).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NdjsonReader, suggestedQuestions, piiNotice, keyPoints, DISCLOSURE } from "@/ask/client.js";
import { KeyPoints } from "../app/p/[tag_uuid]/KeyPoints.js";
import { AskBar } from "../app/p/[tag_uuid]/AskBar.js";

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
});

describe("AskBar", () => {
  it("starts as a full-width bar inviting a question, with the AI disclosure", () => {
    const html = renderToStaticMarkup(<AskBar tagUuid="abc" productTitle="Weekend Chukka" storeName="Queen West Shoes" primaryColor="#000" suggestions={["Does it run small?"]} />);
    expect(html).toContain("Ask about this");
    expect(html).toContain("position:fixed");
    expect(DISCLOSURE("Queen West Shoes")).toBe("Answers are AI-generated. Questions are saved anonymously to help Queen West Shoes improve.");
  });
});
