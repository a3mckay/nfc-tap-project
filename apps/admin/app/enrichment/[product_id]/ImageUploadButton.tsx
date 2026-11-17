"use client";

import { useRef, useState } from "react";
import { shrinkImage, uploadImage } from "@/image-upload.js";

// Photo upload (founder, 2026-11-16): pick a photo, and its tap-page address is
// handed to the field the button sits under.
interface Props {
  shop: string;
  onUploaded(url: string): void;
}

export function ImageUploadButton({ shop, onUploaded }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const photo = await shrinkImage(file);
    const res = photo ? await uploadImage(shop, photo) : { error: "This browser can't read that photo. Try a JPEG or PNG." };
    setBusy(false);
    if ("url" in res) onUploaded(res.url);
    else setError(res.error);
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()}
        style={{ padding: "0.3rem 0.7rem", fontSize: "0.82rem", border: "1px solid #ccc", borderRadius: "4px", background: "#fff", cursor: busy ? "wait" : "pointer" }}>
        {busy ? "Uploading…" : "Upload photo"}
      </button>
      {error && <span role="alert" style={{ fontSize: "0.8rem", color: "#c00" }}>{error}</span>}
    </span>
  );
}
