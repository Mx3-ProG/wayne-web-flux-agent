import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wayne Web Flux",
    short_name: "Wayne Flux",
    description: "Gère ta vitrine, tes produits et tes commandes.",
    start_url: "/espace",
    scope: "/",
    display: "standalone",
    background_color: "#070708",
    theme_color: "#070708",
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
