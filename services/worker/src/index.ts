import Anthropic from "@anthropic-ai/sdk";
import { getPool } from "@nfc/db";
import { runCopyGenerationJob } from "./jobs/generate-copy.js";
import { runCanonicalMatchJob } from "./jobs/match-canonical.js";
import { runEventEnrichmentJob } from "./jobs/enrich-events.js";

const POLL_INTERVAL_MS = 30_000;

const pool = getPool({ connectionString: process.env.DATABASE_URL });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function tick(): Promise<void> {
  const storeIds = (process.env.STORE_IDS ?? "").split(",").filter(Boolean);
  for (const storeId of storeIds) {
    await runCanonicalMatchJob(pool, storeId.trim());
    await runEventEnrichmentJob(pool, storeId.trim());
    await runCopyGenerationJob(pool, client, storeId.trim());
  }
}

async function run(): Promise<void> {
  console.log("[worker] starting, poll interval:", POLL_INTERVAL_MS, "ms");
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error("[worker] tick error:", err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

run().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
