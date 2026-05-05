import type { ReviewAdapter } from "./types.js";
import type { ReviewProvider } from "@nfc/db";
import { judgemeAdapter } from "./judgeme.js";
import { looxAdapter } from "./loox.js";
import { okendoAdapter } from "./okendo.js";
import { yotpoAdapter } from "./yotpo.js";
import { stampedAdapter } from "./stamped.js";

const ADAPTERS: Record<string, ReviewAdapter> = {
  judgeme: judgemeAdapter,
  loox:    looxAdapter,
  okendo:  okendoAdapter,
  yotpo:   yotpoAdapter,
  stamped: stampedAdapter,
};

export function getAdapter(provider: ReviewProvider): ReviewAdapter | null {
  return ADAPTERS[provider] ?? null;
}

export const ALL_ADAPTERS = Object.values(ADAPTERS);
export type { ReviewAdapter, FetchedReview, ProductRef } from "./types.js";
