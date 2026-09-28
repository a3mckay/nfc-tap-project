// Resend wrapper shared by the tap page and the admin. Falls back to console logging in dev if RESEND_API_KEY is unset.
// This means local development works with zero setup — the magic link is logged
// to the server console and you can copy-paste it into the browser.

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  // Same sender the admin's notifications already use (apps/admin/src/lib/notify.ts).
  const from   = process.env.RESEND_FROM ?? "TapShelf <hello@tapshelf.co>";

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log("\n[email:dev] RESEND_API_KEY not set. Email contents:\n", {
      to: input.to,
      subject: input.subject,
      html: input.html,
    }, "\n");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from,
      to:      input.to,
      subject: input.subject,
      html:    input.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}
