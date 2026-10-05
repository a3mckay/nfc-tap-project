// The model ends each answer with a `<<meta {...}>>` line (see prompt.ts).
// The mode line at the start is read separately (readModeLine in handle.ts). This
// splits a streamed answer into the text the customer sees and that metadata,
// holding back anything that might be the start of the marker until it's sure.

export interface AnswerMeta {
  sources: string[];
  regulated: boolean;
}

const MARKER = "<<meta";
const DEFAULT_META: AnswerMeta = { sources: [], regulated: false };

export class MetaSplitter {
  private pending = "";
  private metaRaw: string | null = null;

  // Returns the text that's safe to show now.
  push(chunk: string): string {
    if (this.metaRaw !== null) {
      this.metaRaw += chunk;
      return "";
    }
    this.pending += chunk;
    const at = this.pending.indexOf(MARKER);
    if (at >= 0) {
      const out = this.pending.slice(0, at).trimEnd();
      this.metaRaw = this.pending.slice(at);
      this.pending = "";
      return out;
    }
    // Keep back a tail that could be the start of the marker, plus any
    // whitespace before it (the marker sits on its own line).
    let keep = 0;
    for (let n = Math.min(MARKER.length - 1, this.pending.length); n > 0; n--) {
      if (MARKER.startsWith(this.pending.slice(-n))) { keep = n; break; }
    }
    let cut = this.pending.length - keep;
    while (cut > 0 && /\s/.test(this.pending[cut - 1]!)) cut--;
    const out = this.pending.slice(0, cut);
    this.pending = this.pending.slice(cut);
    return out;
  }

  // The remaining visible text (trailing whitespace trimmed) and the parsed meta.
  end(): { text: string; meta: AnswerMeta } {
    const text = this.pending;
    this.pending = "";
    return { text: this.metaRaw === null ? text : text.trimEnd(), meta: parseMeta(this.metaRaw) };
  }
}

function parseMeta(raw: string | null): AnswerMeta {
  if (!raw) return { ...DEFAULT_META };
  const json = raw.slice(MARKER.length).replace(/>>\s*$/, "").trim();
  try {
    const m = JSON.parse(json) as Partial<AnswerMeta>;
    return {
      sources: Array.isArray(m.sources) ? m.sources.filter((s): s is string => typeof s === "string") : [],
      regulated: m.regulated === true,
    };
  } catch {
    return { ...DEFAULT_META };
  }
}
