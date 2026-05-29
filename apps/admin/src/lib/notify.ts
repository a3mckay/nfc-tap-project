/**
 * Notification send utility.
 * Channel hierarchy: SMS → WhatsApp → Email (Resend).
 * Each channel is tried in order; the first success wins.
 */

import twilio from "twilio";
import type { NotificationChannel } from "@nfc/db";

export interface SendResult {
  channel: NotificationChannel;
  recipient: string;
  sid?: string;
  success: boolean;
  error?: string;
}

interface Recipient {
  phone?: string | null;
  email?: string | null;
  preferred_channel?: NotificationChannel;
}

// ── Twilio client (lazy singleton) ───────────────────────────────────────────

function getTwilioClient() {
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !auth) throw new Error("Twilio credentials not configured");
  return twilio(sid, auth);
}

// ── Individual channel senders ───────────────────────────────────────────────

async function sendSms(to: string, body: string): Promise<{ sid: string }> {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) throw new Error("TWILIO_FROM_NUMBER not set");
  const client = getTwilioClient();
  const msg = await client.messages.create({ to, from, body });
  return { sid: msg.sid };
}

async function sendWhatsApp(to: string, body: string): Promise<{ sid: string }> {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error("TWILIO_WHATSAPP_FROM not set");
  const client = getTwilioClient();
  const toWa = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const msg = await client.messages.create({ to: toWa, from, body });
  return { sid: msg.sid };
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "TapShelf <hello@tapshelf.co>",
      to,
      subject,
      text: body,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}

// ── Main send function ───────────────────────────────────────────────────────

/**
 * Sends a notification to a recipient, falling through the channel hierarchy
 * until one succeeds. Returns which channel was used and whether it worked.
 */
export async function sendNotification(
  recipient: Recipient,
  message: string,
  subject = "A message from TapShelf",
): Promise<SendResult> {
  const { phone, email } = recipient;
  const hasSms       = !!phone;
  const hasWhatsApp  = !!phone && !!process.env.TWILIO_WHATSAPP_FROM;
  const hasEmail     = !!email && !!process.env.RESEND_API_KEY;

  // 1. SMS
  if (hasSms) {
    try {
      const { sid } = await sendSms(phone!, message);
      return { channel: "sms", recipient: phone!, sid, success: true };
    } catch (err) {
      console.warn("SMS send failed, trying next channel:", err);
    }
  }

  // 2. WhatsApp
  if (hasWhatsApp) {
    try {
      const { sid } = await sendWhatsApp(phone!, message);
      return { channel: "whatsapp", recipient: phone!, sid, success: true };
    } catch (err) {
      console.warn("WhatsApp send failed, trying next channel:", err);
    }
  }

  // 3. Email
  if (hasEmail) {
    try {
      await sendEmail(email!, subject, message);
      return { channel: "email", recipient: email!, success: true };
    } catch (err) {
      console.warn("Email send failed:", err);
      return { channel: "email", recipient: email!, success: false, error: String(err) };
    }
  }

  return {
    channel: "email",
    recipient: email ?? phone ?? "unknown",
    success: false,
    error: "No reachable channel — missing phone and email",
  };
}

/**
 * Sends to a list of recipients and returns a summary.
 * Failures are logged but don't abort the batch.
 */
export async function sendBatch(
  recipients: Recipient[],
  message: string,
  subject?: string,
): Promise<{ sent: number; failed: number; results: SendResult[] }> {
  const results = await Promise.allSettled(
    recipients.map((r) => sendNotification(r, message, subject)),
  );
  const settled = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : ({ channel: "email", recipient: "unknown", success: false, error: String((r as PromiseRejectedResult).reason) } as SendResult),
  );
  return {
    sent:    settled.filter((r) => r.success).length,
    failed:  settled.filter((r) => !r.success).length,
    results: settled,
  };
}
