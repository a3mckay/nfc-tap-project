// PRD v4 §12 / docs/PRD-ai-assistant.md §7.1: the privacy page the chat's
// disclosure links to. Plain language; to be revised in the legal review.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage from "../app/privacy/page.js";
import { ChatDisclosure } from "../app/p/[tag_uuid]/AskBar.js";
import { SignInForm } from "../app/me/SignInForm.js";

describe("privacy page", () => {
  const html = renderToStaticMarkup(<PrivacyPage />);

  it("names who runs the service and how to reach them", () => {
    expect(html).toContain("TapShelf");
    expect(html).toContain('href="mailto:hello@tapshelf.co"');
    expect(html).toContain("Last updated");
  });

  it("covers the anonymous cookie and what a tap records", () => {
    expect(html).toContain("nfc_session");
    expect(html).toContain("IP address");
  });

  it("covers saved chat questions: AI answers, personal details removed, who sees them (D10, D19, D20)", () => {
    expect(html).toContain("Anthropic");
    expect(html).toMatch(/email address, phone number or card number/);
    expect(html).toContain("across all stores");
  });

  it("doesn't mention text or WhatsApp alerts, which aren't set up (PRD v4 §16)", () => {
    expect(html).not.toContain("Twilio");
    expect(html).not.toContain("WhatsApp");
  });

  it("covers accounts, alerts, providers, retention and the right to complain", () => {
    for (const s of ["nfc_customer", "Resend", "Railway", "24 months", "outside Canada", "Privacy Commissioner of Canada", "sell personal information"]) {
      expect(html, s).toContain(s);
    }
  });
});

describe("links to the privacy page", () => {
  it("the chat's disclosure line ends with a Privacy link (§7.1)", () => {
    const html = renderToStaticMarkup(<ChatDisclosure storeName="Queen West Shoes" />);
    expect(html).toContain("Questions are saved anonymously to help Queen West Shoes improve.");
    expect(html).toMatch(/<a [^>]*href="\/privacy"[^>]*>Privacy<\/a>/);
  });

  it("the sign-in form links to it", () => {
    expect(renderToStaticMarkup(<SignInForm />)).toContain('href="/privacy"');
  });
});
