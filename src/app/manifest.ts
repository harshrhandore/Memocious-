import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Memocious",
    short_name: "Memocious",
    description: "Thoughtful gifts, made personal.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF8F0",
    theme_color: "#8E2C48",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
