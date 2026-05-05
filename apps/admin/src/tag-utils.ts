import type { TagStatus } from "@nfc/db";

export function formatTagUuid(uuid: string): string {
  return uuid.toUpperCase();
}

export function parseProvisionCount(value: string): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 100) return 100;
  return n;
}

const STATUS_LABELS: Record<TagStatus, string> = {
  unassigned: "Unassigned",
  active: "Active",
  disabled: "Disabled",
  oos: "Out of stock",
};

export function tagStatusLabel(status: TagStatus): string {
  return STATUS_LABELS[status];
}

export function tagTapUrl(baseUrl: string, tagUuid: string): string {
  return `${baseUrl}${tagUuid}`;
}
