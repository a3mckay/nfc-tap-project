// Resend wrapper. Falls back to console logging in dev if RESEND_API_KEY is unset.
// This means local development works with zero setup — the magic link is logged
// to the server console and you can copy-paste it into the browser.

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM ?? "onboarding@resend.dev";

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

export function magicLinkHtml(link: string): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; font-weight: 600; color: #111; margin-bottom: 16px;">Sign in to your tap collection</h1>
      <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 24px;">
        Click the button below to access your collection of tapped products and unlock offers from stores you've visited.
      </p>
      <p style="margin-bottom: 24px;">
        <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Sign in</a>
      </p>
      <p style="font-size: 12px; color: #999;">
        Or paste this link in your browser:<br>
        <span style="font-family: monospace; word-break: break-all;">${link}</span>
      </p>
      <p style="font-size: 12px; color: #999; margin-top: 24px;">
        This link expires in 15 minutes. If you didn't request it, ignore this email.
      </p>
    </div>
  `;
}
