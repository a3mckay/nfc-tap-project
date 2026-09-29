// Emails for staff sign-in (PRD v4 §7 Step 13b).

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const wrap = (body: string) =>
  `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">${body}</div>`;

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">${esc(label)}</a>`;

const SAFARI_NOTE =
  `<p style="font-size: 13px; color: #555; line-height: 1.6;">On iPhone, open this in <strong>Safari</strong> — that's the browser that opens when you tap a product.</p>`;

export function staffSignInEmailHtml(links: { storeName: string; url: string }[]): string {
  const buttons = links
    .map((l) => `<p style="margin: 0 0 12px;">${button(l.url, links.length > 1 ? `Sign in to ${l.storeName}` : "Sign in")}</p>`)
    .join("");
  const intro = links.length > 1
    ? "You're on the team at more than one store. Choose which one to sign in to."
    : `Sign in to the staff view for ${esc(links[0]?.storeName ?? "your store")}.`;
  return wrap(`
    <h1 style="font-size: 18px; font-weight: 600; color: #111; margin-bottom: 16px;">Your TapShelf staff sign-in link</h1>
    <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">${intro}</p>
    ${buttons}
    ${SAFARI_NOTE}
    <p style="font-size: 12px; color: #999; margin-top: 24px;">This link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.</p>
  `);
}

export function staffInviteEmailHtml(storeName: string, signInUrl: string): string {
  return wrap(`
    <h1 style="font-size: 18px; font-weight: 600; color: #111; margin-bottom: 16px;">You've been added to the team at ${esc(storeName)}</h1>
    <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">
      Sign in on your phone, then tap any product in the store to see its staff training notes.
    </p>
    <p style="margin-bottom: 20px;">${button(signInUrl, "Sign in")}</p>
    ${SAFARI_NOTE}
  `);
}

export function setPasswordEmailHtml(storeName: string, roleLabel: string, url: string): string {
  return wrap(`
    <h1 style="font-size: 18px; font-weight: 600; color: #111; margin-bottom: 16px;">You're now a ${esc(roleLabel)} at ${esc(storeName)}</h1>
    <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">
      Set a password to sign in to the TapShelf admin, where you can manage training notes and your team.
    </p>
    <p style="margin-bottom: 20px;">${button(url, "Set your password")}</p>
    <p style="font-size: 12px; color: #999; margin-top: 24px;">This link works once and expires in 3 days.</p>
  `);
}
