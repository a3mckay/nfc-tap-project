// Apps that build link previews (Signal, iMessage, WhatsApp, Slack…) and
// crawlers load the tap page too. They don't count as customer taps.
// Signal and WhatsApp identify as "WhatsApp/…"; iMessage as facebookexternalhit.
const AUTOMATED = /bot\b|bot\/|crawler|spider|facebookexternalhit|whatsapp\/|preview|curl\/|wget\/|python-requests|go-http-client|node-fetch|axios\//i;

export function isAutomatedVisit(userAgent: string | null): boolean {
  if (!userAgent?.trim()) return true;   // every real browser sends one
  return AUTOMATED.test(userAgent);
}
