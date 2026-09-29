// Hands an admin sign-in to the tap page (PRD v4 §7 Step 13c). The tap page is
// on another domain (tapshelf.store) and can't read the admin's cookie, so the
// browser takes a quick trip there with a single-use token, gets the tap page's
// own staff cookie, and comes straight back to `returnPath`.
import { createTapHandoffToken, type TapPrincipal } from "@nfc/db";
import { newSignInToken } from "./sign-in-token.js";

type Pool = Parameters<typeof createTapHandoffToken>[0];

export const TAP_HANDOFF_TTL_SECONDS = 60;

// `next dev` runs the tap page on port 3001; production is tapshelf.store.
export function tapPageBaseUrl(): string {
  const fallback = process.env.NODE_ENV === "development" ? "http://localhost:3001" : "https://tapshelf.store";
  return (process.env.TAP_PAGE_URL ?? fallback).replace(/\/+$/, "");
}

export async function startTapHandoff(pool: Pool, principal: TapPrincipal, returnPath: string): Promise<string> {
  const { token, hash } = await newSignInToken();
  await createTapHandoffToken(pool, { tokenHash: hash, principal, returnPath, ttlSeconds: TAP_HANDOFF_TTL_SECONDS });
  return `${tapPageBaseUrl()}/staff/handoff?token=${token}`;
}
