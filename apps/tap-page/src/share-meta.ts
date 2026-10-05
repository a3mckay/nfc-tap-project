// What a shared tap-page link shows in Signal, iMessage, WhatsApp and so on:
// the product and store as the title, the first key point as the
// description, and the product photo.
import type { Metadata } from "next";

interface ShareInput {
  title: string;
  vendor: string | null;
  images: Array<{ url: string }>;
  storeName: string;
  greatWhen: string[];
  reasonsToBuy: string[];
}

const MAX_DESCRIPTION = 200;

const sentence = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

function clip(s: string): string {
  return s.length <= MAX_DESCRIPTION ? s : `${s.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`;
}

export function shareMetadata({ title, vendor, images, storeName, greatWhen, reasonsToBuy }: ShareInput): Metadata {
  const point = greatWhen[0] ? `Great when ${greatWhen[0]}` : reasonsToBuy[0];
  const fullTitle = storeName ? `${title} · ${storeName}` : title;
  const description = clip(
    point ? [vendor && sentence(vendor), sentence(point.trim())].filter(Boolean).join(" ")
      : storeName ? `See it at ${storeName}.` : title,
  );
  const image = images[0]?.url;
  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      ...(storeName && { siteName: storeName }),
      ...(image && { images: [image] }),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: fullTitle, description },
  };
}
