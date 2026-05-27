import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TapShelf",
    short_name: "TapShelf",
    description: "Your collection of tapped products",
    start_url: "/me",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: "any" as any,
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
