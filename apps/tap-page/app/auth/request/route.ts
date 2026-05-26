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

  // Railway (and most reverse proxies) forward the public-facing host via
  // x-forwarded-host / x-forwarded-proto rather than exposing it in req.url,
  // which contains the internal address (e.g. localhost:3001).
  // BASE_URL env var is the escape hatch for local dev or non-standard proxies.
  const baseUrl =
    process.env.BASE_URL ??
    (() => {
      const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
      const host  = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
                 ?? req.headers.get("host")
                 ?? "tapshelf.store";
      return `${proto}://${host}`;
    })();
  const redirectParam = redirect ? `&redirect=${encodeURIComponent(redirect)}` : "";
  const link = `${baseUrl}/auth/verify?token=${token}${redirectParam}`;

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
