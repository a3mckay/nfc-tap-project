import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPool, getTagByUuid, countRecentSessionQuestions, recordQuestion } from "@nfc/db";
import { SESSION_COOKIE } from "@/lib/cookies.js";
import { getCurrentStaff } from "@/lib/staff-auth.js";
import { handleAsk, type AskDeps, type HistoryTurn } from "@/ask/handle.js";
import { loadAnswerContext } from "@/ask/load.js";
import { streamAnswer } from "@/ask/model.js";

// PRD v4 §7 Step 15c: a customer asks about the product on a live tag. Streams
// newline-delimited JSON events (see AskEvent in src/ask/handle.ts).
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  let body: { tagUuid?: unknown; question?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (typeof body.tagUuid !== "string" || typeof body.question !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Questions aren't available right now" }, { status: 503 });
  }

  // The session cookie is set when the product page loads; it's what the
  // per-visit cap counts against.
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  if (!sessionId) return NextResponse.json({ error: "Open the product page first" }, { status: 400 });

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const [tag, staff] = await Promise.all([getTagByUuid(pool, body.tagUuid), getCurrentStaff()]);
  const isTeam = !!staff && !!tag && staff.storeId === tag.store_id;

  const deps: AskDeps = {
    loadContext: (uuid) => loadAnswerContext(pool, uuid),
    countRecent: (s, p, h) => countRecentSessionQuestions(pool, s, p, h),
    record: async (q) => { await recordQuestion(pool, q); },
    streamModel: streamAnswer,
  };
  const events = handleAsk(
    { tagUuid: body.tagUuid, question: body.question, history: (body.history ?? []) as HistoryTurn[], sessionId, isTeam },
    deps,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
    },
    async cancel() {
      await events.return(undefined);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
