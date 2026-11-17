import type { Pool } from "pg";
import { createHash } from "crypto";

// Photo upload (founder, 2026-11-16): product photos owners upload in the admin.
// Stored in Postgres and served by the tap page at /img/<id> (see DEFERRED.md
// for moving them to object storage behind a CDN).

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

// The admin shrinks photos to 1600 px before uploading; this is a backstop.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// The image's type from its first bytes, never from what the upload claims.
// Only JPEG, PNG and WebP: no SVG, which can carry scripts.
export function imageTypeOf(bytes: Buffer): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export type SaveImageResult = { ok: true; id: string } | { ok: false; error: "not_an_image" | "too_large" };

export async function saveUploadedImage(pool: Pool, storeId: string, bytes: Buffer): Promise<SaveImageResult> {
  const contentType = imageTypeOf(bytes);
  if (!contentType) return { ok: false, error: "not_an_image" };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "too_large" };
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const { rows } = await pool.query<{ id: string }>(
    `insert into uploaded_images (store_id, content_type, sha256, bytes) values ($1, $2, $3, $4)
     on conflict (store_id, sha256) do update set store_id = excluded.store_id
     returning id`,
    [storeId, contentType, sha256, bytes],
  );
  return { ok: true, id: rows[0]!.id };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getUploadedImage(pool: Pool, id: string): Promise<{ contentType: ImageType; bytes: Buffer } | null> {
  if (!UUID.test(id)) return null;
  const { rows } = await pool.query<{ content_type: ImageType; bytes: Buffer }>(
    `select content_type, bytes from uploaded_images where id = $1`,
    [id],
  );
  return rows[0] ? { contentType: rows[0].content_type, bytes: rows[0].bytes } : null;
}
