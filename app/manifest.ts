import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ganamos!",
    short_name: "Ganamos!",
    description: "Fix your community, earn Bitcoin",
    start_url: "/",
    display: "standalone",
    background_color: "#10b981",
    theme_color: "#10b981",
    icons: [
      {
        src: "/favicon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
