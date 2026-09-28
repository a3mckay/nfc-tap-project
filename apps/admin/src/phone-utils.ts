/**
 * Normalizes a phone number to E.164 (+[country][number]). Returns null if empty or invalid.
 * A bare 10-digit number (no +) is assumed North American and gets +1 — our stores are
 * Canadian, and without this "416-555-1234" would become a Swiss number (+41…).
 */
export function normalizePhone(raw: string): string | null {
  if (!raw.trim()) return null;
  const cleaned = raw.replace(/[^0-9+]/g, "");
  let e164: string;
  if (cleaned.startsWith("+")) e164 = cleaned;
  else if (cleaned.length === 10) e164 = `+1${cleaned}`;
  else e164 = `+${cleaned}`;
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : null;
}
