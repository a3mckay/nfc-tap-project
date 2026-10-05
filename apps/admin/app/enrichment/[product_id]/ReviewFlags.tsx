// PRD v4 §7 Step 15k: things on this product the store should check (D49, D50).
interface Props { flags: Array<{ kind: "contradiction" | "mismatch"; message: string }> }

export function ReviewFlags({ flags }: Props) {
  if (!flags.length) return null;
  return (
    <div role="status" style={{ margin: "0 0 1.25rem", padding: "0.75rem 1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }}>
      <p style={{ margin: "0 0 0.35rem", fontSize: "0.85rem", fontWeight: 600, color: "#92400e" }}>Check these before customers ask</p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.85rem", color: "#78350f", lineHeight: 1.5 }}>
        {flags.map((f, i) => (
          <li key={i}>{f.kind === "mismatch" ? "Research didn't fit this product: " : "Notes disagree: "}{f.message}</li>
        ))}
      </ul>
      <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "#a16207" }}>The AI assistant gives the more cautious answer until you fix it. This clears when the notes agree.</p>
    </div>
  );
}
