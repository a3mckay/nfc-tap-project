/**
 * Normalizes a staff email for storage and lookup: trimmed and lower-cased.
 * Returns null if empty or not shaped like an email address.
 */
export function normalizeStaffEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

// Managers' and co-managers' admin passwords.
export const MIN_PASSWORD_LENGTH = 10;
