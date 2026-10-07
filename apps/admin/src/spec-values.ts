// PRD v4 §7 Step 15l: the spec boxes after the saved specs change (e.g. after
// Generate). Untouched boxes show the saved value; a box the owner has typed in
// and not saved keeps their text, since what they type always wins.
export function syncSpecValues(
  current: Record<string, string>,
  edited: ReadonlySet<string>,
  saved: Array<{ key: string; value: string }>,
): Record<string, string> {
  const next: Record<string, string> = Object.fromEntries(Object.keys(current).map((k) => [k, ""]));
  for (const s of saved) next[s.key] = s.value;
  for (const k of edited) next[k] = current[k] ?? "";
  return next;
}
