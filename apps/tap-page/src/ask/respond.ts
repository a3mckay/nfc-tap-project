// PRD v4 §7 Steps 15c/15h: turns a request into a streamed answer. Shared by
// the customer endpoint (/api/ask) and the staff one (/api/staff-ask); the
// caller decides who's asking.
import { NextResponse } from "next/server";
import {
  getPool, countRecentSessionQuestions, recordQuestion,
  getUngroupedQuestions, getThemeOptions, applyThemeAssignments,
} from "@nfc/db";
import { handleAsk, type AskDeps, type HistoryTurn } from "./handle.js";
import { loadAnswerContext } from "./load.js";
import { streamAnswer } from "./model.js";
import { groupProductQuestions } from "./group.js";
import { classifyQuestions } from "./classify.js";

export interface AskBody { tagUuid: string; question: string; history: HistoryTurn[] }

export async function readAskBody(request: Request): Promise<AskBody | null> {
  try {
    const body = await request.json() as { tagUuid?: unknown; question?: unknown; history?: unknown };
    if (typeof body.tagUuid !== "string" || typeof body.question !== "string") return null;
    return { tagUuid: body.tagUuid, question: body.question, history: (Array.isArray(body.history) ? body.history : []) as HistoryTurn[] };
  } catch {
    return null;
  }
}

export function respondToAsk(
  body: AskBody,
  who: { audience: "customer" | "staff"; sessionId: string | null; isTeam: boolean; staffId: string | null },
): Response {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  let productTitle = "";
  const deps: AskDeps = {
    loadContext: async (uuid) => {
      const loaded = await loadAnswerContext(pool, uuid, who.audience);
      productTitle = loaded?.context.product.title ?? "";
      return loaded;
    },
    countRecent: (s, p, h) => countRecentSessionQuestions(pool, s, p, h),
    record: async (q) => {
      await recordQuestion(pool, q);
      // Group it into a theme in the background (Step 15f); the answer has already been sent.
      void groupProductQuestions(q.storeId, q.productId, productTitle, {
        getUngrouped: (s, p, n) => getUngroupedQuestions(pool, s, p, n),
        getOptions: (s, p) => getThemeOptions(pool, s, p),
        apply: (s, p, a) => applyThemeAssignments(pool, s, p, a),
        classify: classifyQuestions,
      }).catch((err) => console.error("[ask] grouping failed:", err));
    },
    streamModel: streamAnswer,
  };
  const events = handleAsk({ ...body, sessionId: who.sessionId, isTeam: who.isTeam, audience: who.audience, staffId: who.staffId }, deps);

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
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

export const notAvailable = () => NextResponse.json({ error: "Questions aren't available right now" }, { status: 503 });
export const badRequest = () => NextResponse.json({ error: "Bad request" }, { status: 400 });
