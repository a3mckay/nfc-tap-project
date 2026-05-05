import type { StoreTier } from "@nfc/db";

export type TierFeature = "ai_copy" | "tags" | "analytics_days";

interface TierLimit {
  ai_copy: number;
  tags: number;
  analytics_days: number;
}

export const TIER_LIMITS: Record<StoreTier, TierLimit> = {
  free:       { ai_copy: 10,       tags: 5,    analytics_days: 7   },
  starter:    { ai_copy: 100,      tags: 50,   analytics_days: 30  },
  pro:        { ai_copy: 1000,     tags: 500,  analytics_days: 90  },
  enterprise: { ai_copy: Infinity, tags: Infinity, analytics_days: Infinity },
};

export function tierAllows(
  tier: StoreTier,
  feature: TierFeature,
  currentUsage: number,
): boolean {
  const limit = TIER_LIMITS[tier][feature];
  // analytics_days is a ceiling (requested value must be ≤ limit)
  // ai_copy and tags are running counts (must be < limit to allow one more)
  if (feature === "analytics_days") return currentUsage <= limit;
  return currentUsage < limit;
}

const LABELS: Record<StoreTier, string> = {
  free:       "Free",
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
};

export function tierLabel(tier: StoreTier): string {
  return LABELS[tier];
}
