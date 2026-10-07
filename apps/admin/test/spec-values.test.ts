// PRD v4 §7 Step 15l: the spec boxes pick up values saved by Generate without
// a page reload; a box the owner has typed in and not saved keeps their text.
import { describe, it, expect } from "vitest";
import { syncSpecValues } from "../src/spec-values.js";

const spec = (key: string, value: string) => ({ key, value });

describe("syncSpecValues", () => {
  it("fills empty boxes with newly saved values", () => {
    const next = syncSpecValues({}, new Set(), [spec("strain_type", "Sativa-dominant hybrid"), spec("producer", "Carmel")]);
    expect(next).toEqual({ strain_type: "Sativa-dominant hybrid", producer: "Carmel" });
  });

  it("replaces untouched boxes with the saved value", () => {
    const next = syncSpecValues({ producer: "Old" }, new Set(), [spec("producer", "Carmel")]);
    expect(next.producer).toBe("Carmel");
  });

  it("keeps what the owner typed and hasn't saved", () => {
    const next = syncSpecValues({ thc: "24%" }, new Set(["thc"]), [spec("thc", "22–26%")]);
    expect(next.thc).toBe("24%");
  });

  it("clears an untouched box whose saved value was removed", () => {
    const next = syncSpecValues({ size: "3.5 g" }, new Set(), []);
    expect(next.size).toBe("");
  });

  it("keeps a typed box even when nothing is saved for it", () => {
    const next = syncSpecValues({ size: "7 g" }, new Set(["size"]), []);
    expect(next.size).toBe("7 g");
  });
});
