// PRD v4 §7 Step 15f: groups a product's ungrouped questions into themes, right
// after a question is saved (docs/PRD-ai-assistant.md D8). Product themes
// ("Does it run small?") roll up into store-wide themes ("Sizing"). Anything that
// fails to group is picked up by the next run for the product, so no scheduled
// job is needed. Stock and size-availability questions always go to one theme
// (D25). The model call and database are injected.
import type { ThemeAssignment, ThemeOptions, UngroupedQuestion } from "@nfc/db";

export const STOCK_THEME = { label: "Stock and size availability", storeTheme: "Stock and availability" };
export const THEME_KINDS = ["fit", "sizing", "materials", "care", "origin", "features", "occasion", "comparison", "stock", "price", "policy", "other"] as const;
const BATCH = 20;

export interface ClassifyInput {
  productTitle: string;
  productThemes: Array<{ id: string; label: string; storeTheme: string | null }>;
  storeThemes: string[];
  questions: Array<{ id: string; text: string }>;
}

export interface ClassifyOutput {
  assignments: Array<{
    question_id: string;
    theme_id: string | null;
    new_theme: { label: string; kind: string; store_theme: string } | null;
  }>;
}

export interface GroupDeps {
  getUngrouped(storeId: string, productId: string, limit: number): Promise<UngroupedQuestion[]>;
  getOptions(storeId: string, productId: string): Promise<ThemeOptions>;
  apply(storeId: string, productId: string, assignments: ThemeAssignment[]): Promise<void>;
  classify(input: ClassifyInput): Promise<ClassifyOutput>;
}

// Returns how many questions were grouped.
export async function groupProductQuestions(storeId: string, productId: string, productTitle: string, deps: GroupDeps): Promise<number> {
  const questions = await deps.getUngrouped(storeId, productId, BATCH);
  if (!questions.length) return 0;
  const options = await deps.getOptions(storeId, productId);

  const out = await deps.classify({
    productTitle,
    productThemes: options.productThemes.map((t) => ({ id: t.id, label: t.label, storeTheme: t.storeTheme })),
    storeThemes: options.storeThemes.map((t) => t.label),
    questions: questions.map((q) => ({ id: q.id, text: q.question_text })),
  });

  const byId = new Map(questions.map((q) => [q.id, q]));
  const themeIds = new Set(options.productThemes.map((t) => t.id));
  const stockTheme = options.productThemes.find((t) => t.label === STOCK_THEME.label);
  const seen = new Set<string>();
  const assignments: ThemeAssignment[] = [];

  for (const a of out.assignments ?? []) {
    const q = byId.get(a.question_id);
    if (!q || seen.has(q.id)) continue;
    if ((q.sources ?? []).some((s) => s.kind === "stock_reply")) {
      seen.add(q.id);
      assignments.push(stockTheme
        ? { questionId: q.id, themeId: stockTheme.id }
        : { questionId: q.id, newTheme: { label: STOCK_THEME.label, kind: "stock", storeTheme: STOCK_THEME.storeTheme } });
    } else if (a.theme_id && themeIds.has(a.theme_id)) {
      seen.add(q.id);
      assignments.push({ questionId: q.id, themeId: a.theme_id });
    } else if (a.new_theme?.label?.trim() && a.new_theme.store_theme?.trim()) {
      seen.add(q.id);
      const kind = (THEME_KINDS as readonly string[]).includes(a.new_theme.kind) ? a.new_theme.kind : "other";
      assignments.push({ questionId: q.id, newTheme: { label: a.new_theme.label.trim().slice(0, 120), kind, storeTheme: a.new_theme.store_theme.trim().slice(0, 60) } });
    }
  }
  if (assignments.length) await deps.apply(storeId, productId, assignments);
  return assignments.length;
}
