// Photo upload (founder, 2026-11-16): owners upload product photos instead of
// pasting image links. The bytes live in Postgres; the tap page serves them.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { imageTypeOf, saveUploadedImage, getUploadedImage, MAX_IMAGE_BYTES } from "../src/uploaded-images.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seeded: string[] = [];
async function seedStore(): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`images-test-${randomUUID()}.myshopify.com`],
  );
  seeded.push(rows[0]!.id);
  return rows[0]!.id;
}

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);

let own: string;
let other: string;
beforeEach(async () => {
  own = await seedStore();
  other = await seedStore();
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seeded]);
  await pool.end();
});

describe("imageTypeOf", () => {
  it("knows JPEG, PNG and WebP by their first bytes, whatever the file claims", () => {
    expect(imageTypeOf(JPEG)).toBe("image/jpeg");
    expect(imageTypeOf(PNG)).toBe("image/png");
    expect(imageTypeOf(WEBP)).toBe("image/webp");
    expect(imageTypeOf(Buffer.from("<svg xmlns=…>"))).toBeNull();   // SVG can carry scripts
    expect(imageTypeOf(Buffer.from([]))).toBeNull();
  });
});

describe("uploaded images", () => {
  it("saves a photo and serves it back with its type", async () => {
    const saved = await saveUploadedImage(pool, own, JPEG);
    expect(saved).toMatchObject({ ok: true });
    const id = (saved as { id: string }).id;
    expect(await getUploadedImage(pool, id)).toEqual({ contentType: "image/jpeg", bytes: JPEG });
  });

  it("refuses files that aren't JPEG, PNG or WebP, and files over the size limit", async () => {
    expect(await saveUploadedImage(pool, own, Buffer.from("GIF89a"))).toEqual({ ok: false, error: "not_an_image" });
    const huge = Buffer.concat([JPEG, Buffer.alloc(MAX_IMAGE_BYTES)]);
    expect(await saveUploadedImage(pool, own, huge)).toEqual({ ok: false, error: "too_large" });
  });

  it("returns the same image when a store uploads the same photo twice, but keeps stores apart", async () => {
    const a = await saveUploadedImage(pool, own, PNG);
    const b = await saveUploadedImage(pool, own, PNG);
    const c = await saveUploadedImage(pool, other, PNG);
    expect(a).toEqual(b);
    expect(c).not.toEqual(a);
  });

  it("returns null for an unknown or malformed id", async () => {
    expect(await getUploadedImage(pool, randomUUID())).toBeNull();
    expect(await getUploadedImage(pool, "not-a-uuid")).toBeNull();
  });
});
