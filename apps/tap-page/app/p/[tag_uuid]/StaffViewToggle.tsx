// PRD v4 §7 Step 13d: sticky Training | Customer switch for staff and owners,
// the same in both views.

interface Props {
  current: "training" | "preview";
  tagUuid: string;
  storeName: string;
}

const option = (active: boolean): React.CSSProperties => ({
  flex: 1,
  textAlign: "center",
  padding: "0.5rem 0",
  borderRadius: "999px",
  fontSize: "0.85rem",
  fontWeight: 600,
  textDecoration: "none",
  color: active ? "#111" : "#ccc",
  background: active ? "#fff" : "transparent",
});

export function StaffViewToggle({ current, tagUuid, storeName }: Props) {
  const training = current === "training";
  return (
    <nav aria-label="Staff view" style={{ position: "sticky", top: 0, zIndex: 50, background: "#111", color: "#fff", padding: "0.6rem 1rem 0.7rem" }}>
      <p style={{ fontSize: "0.7rem", letterSpacing: "0.04em", color: "#aaa", margin: "0 0 0.45rem", textAlign: "center" }}>
        {training ? `${storeName} · Staff` : "Customer preview · reactions and sign-ups off"}
      </p>
      <div style={{ display: "flex", gap: "4px", padding: "3px", background: "#333", borderRadius: "999px", maxWidth: "20rem", margin: "0 auto" }}>
        <a href={`/p/${tagUuid}`} aria-current={training ? "page" : undefined} style={option(training)}>Training</a>
        <a href={`/p/${tagUuid}?view=customer`} aria-current={training ? undefined : "page"} style={option(!training)}>Customer</a>
      </div>
    </nav>
  );
}
