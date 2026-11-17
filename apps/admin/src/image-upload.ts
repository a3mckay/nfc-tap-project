// Photo upload (founder, 2026-11-16): shrink a photo in the browser, then post
// it to /api/images, which returns the address the tap page serves it from.

export const MAX_SIDE = 1600;

export function targetSize(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Browser only: redraws the photo at targetSize as a JPEG. Null if the browser
// can't read the file (e.g. HEIC outside Safari).
export async function shrinkImage(file: Blob): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = targetSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

export async function uploadImage(
  shop: string,
  photo: Blob,
  fetchFn: typeof fetch = fetch,
): Promise<{ url: string } | { error: string }> {
  const form = new FormData();
  form.append("file", photo, "photo.jpg");
  try {
    const res = await fetchFn(`/api/images?shop=${encodeURIComponent(shop)}`, { method: "POST", body: form });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && body.url) return { url: body.url };
    return { error: body.error ?? "The upload didn't go through. Try again." };
  } catch {
    return { error: "The upload didn't go through. Check your connection and try again." };
  }
}
