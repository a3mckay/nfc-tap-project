// PRD v4 §7 Step 13c: admin side of the handoff to the tap page.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const db = vi.hoisted(() => ({ createTapHandoffToken: vi.fn(async () => {}) }));
vi.mock("@nfc/db", () => db);

const { startTapHandoff, tapPageBaseUrl, TAP_HANDOFF_TTL_SECONDS } = await import("../src/tap-handoff.js");
const { hashSignInToken } = await import("../src/sign-in-token.js");

beforeEach(() => vi.clearAllMocks());
afterEach(() => { delete process.env.TAP_PAGE_URL; });

describe("startTapHandoff", () => {
  it("stores a 60-second token for the principal and returns the tap-page link", async () => {
    const url = new URL(await startTapHandoff({} as never, { kind: "owner", storeAdminId: "a-1", storeId: "s-1" }, "/tags?shop=x"));
    expect(url.origin + url.pathname).toBe("https://tapshelf.store/staff/handoff");
    expect(TAP_HANDOFF_TTL_SECONDS).toBe(60);
    expect(db.createTapHandoffToken).toHaveBeenCalledWith(expect.anything(), {
      tokenHash: await hashSignInToken(url.searchParams.get("token")!),
      principal: { kind: "owner", storeAdminId: "a-1", storeId: "s-1" },
      returnPath: "/tags?shop=x",
      ttlSeconds: 60,
    });
  });

  it("uses TAP_PAGE_URL when set (local development)", () => {
    process.env.TAP_PAGE_URL = "http://localhost:3001/";
    expect(tapPageBaseUrl()).toBe("http://localhost:3001");
  });
});
