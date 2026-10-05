// PRD v4 §7 Step 8c: the daily job that deletes raw data older than 24 months.
// Called by .github/workflows/scheduled-jobs.yml with the shared CRON_SECRET.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  deleteExpiredRawData: vi.fn(async () => ({ tap_events: 3, tap_reactions: 1, product_questions: 2 })),
}));
vi.mock("@nfc/db", () => db);

const load = async (secret: string | undefined) => {
  vi.resetModules();
  if (secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = secret;
  return (await import("../app/api/cron/retention/route.js")).GET;
};
const req = (auth?: string) =>
  new NextRequest("https://admin.tapshelf.co/api/cron/retention", { headers: auth ? { authorization: auth } : {} });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/cron/retention", () => {
  it("deletes expired raw data and reports how much", async () => {
    const GET = await load("s3cret");
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: { tap_events: 3, tap_reactions: 1, product_questions: 2 } });
    expect(db.deleteExpiredRawData).toHaveBeenCalledTimes(1);
  });

  it("refuses a wrong secret, a missing one, or any call when no secret is set", async () => {
    expect((await (await load("s3cret"))(req("Bearer nope"))).status).toBe(401);
    expect((await (await load("s3cret"))(req())).status).toBe(401);
    expect((await (await load(undefined))(req("Bearer "))).status).toBe(401);
    expect(db.deleteExpiredRawData).not.toHaveBeenCalled();
  });
});
