// PRD v4 §7 Step 15i: wording for the admin home page.

export function weekChange(thisWeek: number, lastWeek: number): string | null {
  if (!thisWeek && !lastWeek) return null;
  if (!lastWeek) return "New this week";
  const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  if (pct === 0) return "Same as last week";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% vs last week`;
}

// The dashboard card (D44): "Customers asked 38 questions this week · top theme: Sizing".
export function questionsHeadline(count: number, topTheme: string | null): string {
  if (!count) return "No customer questions this week yet";
  const base = `Customers asked ${count} question${count === 1 ? "" : "s"} this week`;
  return topTheme ? `${base} · top theme: ${topTheme}` : base;
}
