import { describe, it, expect } from "vitest";
import { derivePriceTier } from "../src/jobs/enrich-events.js";

describe("derivePriceTier", () => {
  it("returns budget for prices below 50", () => {
    expect(derivePriceTier(0)).toBe("budget");
    expect(derivePriceTier(49.99)).toBe("budget");
  });

  it("returns mid for prices 50–199.99", () => {
    expect(derivePriceTier(50)).toBe("mid");
    expect(derivePriceTier(199.99)).toBe("mid");
  });

  it("returns premium for prices 200–499.99", () => {
    expect(derivePriceTier(200)).toBe("premium");
    expect(derivePriceTier(499.99)).toBe("premium");
  });

  it("returns luxury for prices 500 and above", () => {
    expect(derivePriceTier(500)).toBe("luxury");
    expect(derivePriceTier(1200)).toBe("luxury");
  });

  it("returns null for null price", () => {
    expect(derivePriceTier(null)).toBeNull();
  });
});
