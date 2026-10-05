// PRD v4 §7 Step 15e: the three key points under the product name (D3, D21).
import { keyPoints } from "@/ask/client.js";

interface Props {
  greatWhen: string[];
  reasonsToBuy: string[];
  primaryColor: string;
}

export function KeyPoints({ greatWhen, reasonsToBuy, primaryColor }: Props) {
  const kp = keyPoints(greatWhen, reasonsToBuy);
  if (!kp) return null;
  return (
    <section>
      <h2 style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "0.6rem" }}>{kp.title}</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {kp.points.map((point, i) => (
          <li key={i} style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", fontSize: "0.92rem", lineHeight: 1.5, color: "#222" }}>
            {/* A plain dot: ✦ is kept for the AI (the Ask bar and chat). */}
            <span aria-hidden="true" style={{ width: "6px", height: "6px", background: primaryColor, borderRadius: "50%", flexShrink: 0, marginTop: "0.55em" }} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
