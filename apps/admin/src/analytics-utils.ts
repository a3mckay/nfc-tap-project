import type { DailyTap } from "@nfc/db";

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function pctOf(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((part / total) * 1000) / 10);
}

export function fillDailyGaps(
  rows: DailyTap[],
  startDate: string,
  endDate: string,
): DailyTap[] {
  const map = new Map(rows.map((r) => [r.date, r.tap_count]));
  const result: DailyTap[] = [];
  const cur = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cur <= end) {
    const date = cur.toISOString().slice(0, 10);
    result.push({ date, tap_count: map.get(date) ?? 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return result;
}

export function buildSparklinePath(
  data: DailyTap[],
  width: number,
  height: number,
): string {
  if (data.length === 0) return "";
  const max = Math.max(...data.map((d) => d.tap_count), 1);
  const xStep = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((d, i) => {
    const x = i * xStep;
    const y = height - (d.tap_count / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${points.join("L")}`;
}
