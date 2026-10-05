// PRD v4 §7 Step 15h: the staff Ask box only answers signed-in staff (or the
// owner) of the tag's store.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getCurrentStaff = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({ getPool: vi.fn(() => ({})), getTagByUuid: vi.fn(), recordQuestion: vi.fn(), countRecentSessionQuestions: vi.fn(), getUngroupedQuestions: vi.fn(), getThemeOptions: vi.fn(), applyThemeAssignments: vi.fn() }));
vi.mock("@nfc/db", () => db);
vi.mock("@/lib/staff-auth.js", () => ({ getCurrentStaff }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const { POST } = await import("../app/api/staff-ask/route.js");
const post = () => POST(new NextRequest(new URL("/api/staff-ask", "https://tapshelf.test"), {
  method: "POST", body: JSON.stringify({ tagUuid: "u", question: "Is it waterproof?", history: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test";
  db.getTagByUuid.mockResolvedValue({ id: "t-1", store_id: "store-1", product_id: "p-1", status: "active" });
});

describe("POST /api/staff-ask", () => {
  it("refuses anyone who isn't signed in as staff", async () => {
    getCurrentStaff.mockResolvedValue(null);
    expect((await post()).status).toBe(403);
  });

  it("refuses staff of another store", async () => {
    getCurrentStaff.mockResolvedValue({ kind: "staff", staffId: "st-9", storeId: "store-2" });
    expect((await post()).status).toBe(403);
  });
});
