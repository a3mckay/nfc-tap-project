// The 19+ age gate on cannabis pages (founder decision, 2026-10-07).
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const cookieSet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { AgeGate } = await import("../app/AgeGate.js");
const { confirmAgeAction } = await import("../app/age-actions.js");
const { AGE_COOKIE } = await import("@/cannabis.js");

describe("AgeGate", () => {
  it("asks whether the visitor is 19 or older, and shows nothing about the product", () => {
    const html = renderToStaticMarkup(<AgeGate storeName="Gym Cannabis" minAge={19} />);
    expect(html).toContain("Gym Cannabis");
    expect(html).toMatch(/19 or older/);
    expect(html).toMatch(/under 19/i);
  });
});

describe("confirmAgeAction", () => {
  it("remembers the answer for a day, out of reach of page scripts", async () => {
    await confirmAgeAction();
    expect(cookieSet).toHaveBeenCalledWith(AGE_COOKIE, "1", expect.objectContaining({ httpOnly: true, maxAge: 60 * 60 * 24, path: "/" }));
  });
});
