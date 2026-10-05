// PRD v4 §7 Step 15a: customers' typed questions are stored without personal
// details (docs/PRD-ai-assistant.md D10, D30). redactPii replaces what it finds
// with a placeholder that names the type, and reports the types it removed.
import { describe, expect, it } from "vitest";
import { redactPii } from "../src/pii.js";

describe("redactPii", () => {
  it("removes email addresses", () => {
    expect(redactPii("Email me at sam.lee+shoes@example.co.uk about sizes")).toEqual({
      text: "Email me at [email removed] about sizes",
      removed: ["email"],
    });
  });

  it("removes North American phone numbers in common formats", () => {
    for (const phone of ["416-555-0199", "(416) 555-0199", "416.555.0199", "416 555 0199", "+1 416 555 0199", "1-416-555-0199", "4165550199"]) {
      expect(redactPii(`Text me ${phone} please`), phone).toEqual({
        text: "Text me [phone number removed] please",
        removed: ["phone"],
      });
    }
  });

  it("removes international numbers written with a leading +", () => {
    expect(redactPii("call +44 20 7946 0958").text).toBe("call [phone number removed]");
  });

  it("removes card numbers that pass the Luhn check", () => {
    expect(redactPii("my card is 4111 1111 1111 1111")).toEqual({
      text: "my card is [card number removed]",
      removed: ["card"],
    });
  });

  it("leaves product talk alone: sizes, prices, style codes, years, short numbers", () => {
    for (const q of [
      "Do you have the 990v6 in a 10.5 wide?",
      "Is the $245 boot cheaper online?",
      "Style M1906R vs 2002R?",
      "Does the 2024 version run small?",
      "Is it 100% merino, 18.5 micron?",
      "Would a 32x34 fit someone 6'1\"?",
      "SKU 573-201-08 in stock?",
    ]) {
      expect(redactPii(q), q).toEqual({ text: q, removed: [] });
    }
  });

  it("reports each type once, in a stable order", () => {
    const r = redactPii("a@b.co or c@d.co or 416-555-0199");
    expect(r.removed).toEqual(["email", "phone"]);
    expect(r.text).toBe("[email removed] or [email removed] or [phone number removed]");
  });
});
