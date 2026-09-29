// Wording for staff training progress (PRD v4 §7 Step 13f).

export function reviewedLabel(reviewed: number, total: number): string {
  if (total === 0) return "No tagged products yet";
  return `${reviewed} of ${total} ${total === 1 ? "product" : "products"} reviewed`;
}

export function lastActiveLabel(lastViewedAt: Date | null, now = new Date()): string {
  if (!lastViewedAt) return "hasn't tapped anything yet";
  const day = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const days = day(now) - day(lastViewedAt);
  if (days <= 0) return "last active today";
  if (days === 1) return "last active yesterday";
  return `last active ${days} days ago`;
}
