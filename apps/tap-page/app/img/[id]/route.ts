import { NextRequest, NextResponse } from "next/server";
import { getPool, getUploadedImage } from "@nfc/db";

// Photo upload (founder, 2026-11-16): product photos uploaded in the admin.
// An id's bytes never change, so browsers may cache them for a year.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const image = await getUploadedImage(getPool({ connectionString: process.env.DATABASE_URL }), id);
  if (!image) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
