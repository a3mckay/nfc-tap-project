// PRD v4 §7 Step 13d: the staff training view on tap.
import type { TapPrincipal, ProductTraining, FaqItem } from "@nfc/db";

export type TapView = "customer" | "training" | "preview";

// Staff and owners of the tag's store get the training view by default and can
// switch to a preview of the customer page with ?view=customer. Anyone else,
// including staff of another store, gets the normal customer page.
export function decideTapView(
  staff: TapPrincipal | null,
  tagStoreId: string,
  viewParam: string | undefined,
): TapView {
  if (!staff || staff.storeId !== tagStoreId) return "customer";
  return viewParam === "customer" ? "preview" : "training";
}

export type TrainingSection =
  | { title: string; kind: "text"; text: string }
  | { title: string; kind: "list"; items: string[] }
  | { title: string; kind: "qa"; items: FaqItem[] };

type TrainingFields = Omit<ProductTraining, "product_id" | "store_id" | "updated_at">;
interface CustomerCopy {
  fit_notes: string | null;
  materials: string | null;
  faq: FaqItem[];
  internal_staff_notes: string | null;
}

const text = (title: string, value: string | null): TrainingSection[] =>
  value?.trim() ? [{ title, kind: "text", text: value.trim() }] : [];

// The owner's notes in the order they write them. With no notes yet, falls back
// to the customer page's fit, materials and FAQ so staff still have something.
export function trainingSections(
  t: TrainingFields | null,
  copy: CustomerCopy | null,
): { sections: TrainingSection[]; hasOwnerNotes: boolean } {
  const owner: TrainingSection[] = t
    ? [
        ...text("The one-line sell", t.one_line_sell),
        ...text("Who it's for", t.who_its_for),
        ...text("Who it's not for", t.who_its_not_for),
        ...text("Fit and sizing", t.fit_and_sizing),
        ...(t.worth_the_price.length ? [{ title: "Why it's worth the price", kind: "list" as const, items: t.worth_the_price }] : []),
        ...text("Closest alternative in the store", t.closest_alternative),
        ...(t.common_questions.length ? [{ title: "Common questions", kind: "qa" as const, items: t.common_questions }] : []),
        ...text("Goes well with", t.companion_products),
        ...text("About the brand", t.brand_context),
        ...text("Stock note", t.stock_note),
      ]
    : [];

  if (owner.length > 0) {
    return { sections: [...owner, ...text("Internal notes", copy?.internal_staff_notes ?? null)], hasOwnerNotes: true };
  }

  const fallback: TrainingSection[] = copy
    ? [
        ...text("Fit", copy.fit_notes),
        ...text("Materials", copy.materials),
        ...(copy.faq.length ? [{ title: "Common questions", kind: "qa" as const, items: copy.faq }] : []),
        ...text("Internal notes", copy.internal_staff_notes),
      ]
    : [];
  return { sections: fallback, hasOwnerNotes: false };
}

export function stockNoteAge(updatedAt: Date | null, now = new Date()): string | null {
  if (!updatedAt) return null;
  const day = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const days = day(now) - day(updatedAt);
  if (days <= 0) return "updated today";
  if (days === 1) return "updated yesterday";
  return `updated ${days} days ago`;
}
