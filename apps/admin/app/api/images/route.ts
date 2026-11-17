import { NextRequest, NextResponse } from "next/server";
import { getPool, saveUploadedImage } from "@nfc/db";
import { getActionStore } from "@/current-store.js";

// Photo upload (founder, 2026-11-16). The browser shrinks the photo first
// (ImageUpload.tsx); the tap page serves it at /img/<id>.
const ERRORS = {
  not_an_image: "That file isn't a photo we can use. Upload a JPEG, PNG or WebP image.",
  too_large: "That photo is too large. Try a smaller one.",
} as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const shop = request.nextUrl.searchParams.get("shop") ?? "";
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "content");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });

  const saved = await saveUploadedImage(pool, store.id, Buffer.from(await file.arrayBuffer()));
  if (!saved.ok) return NextResponse.json({ error: ERRORS[saved.error] }, { status: 400 });
  const base = (process.env.TAP_PAGE_CDN_URL ?? "http://localhost:3001").replace(/\/+$/, "");
  return NextResponse.json({ url: `${base}/img/${saved.id}` });
}
