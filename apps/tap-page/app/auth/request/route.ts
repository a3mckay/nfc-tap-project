import { NextRequest, NextResponse } from "next/server";
import { getPool, createAuthToken } from "@nfc/db";
import { generateMagicToken } from "@/lib/auth.js";
import { sendEmail, magicLinkHtml } from "@/lib/email.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let email: string;
  let redirect: string | undefined;
  try {
    const body = await req.json() as { email?: string; redirect?: string };
    email = (body.email ?? "").trim().toLowerCase();
    redirect = body.redirect;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const token = generateMagicToken();
  await createAuthToken(pool, token, email, 15);

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const redirectParam = redirect ? `&redirect=${encodeURIComponent(redirect)}` : "";
  const link = `${origin}/auth/verify?token=${token}${redirectParam}`;

  try {
    await sendEmail({
      to: email,
      subject: "Your sign-in link",
      html: magicLinkHtml(link),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth/request] sendEmail failed:", err);
    return NextResponse.json({ error: "Couldn't send email. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
