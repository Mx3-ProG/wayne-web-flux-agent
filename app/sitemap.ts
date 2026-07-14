import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";

// Sitemap des pages publiques de l'application (hors mentions légales et hors
// zones authentifiées). Les vitrines des utilisateurs sont dans app/p/sitemap.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/commencer", "/formules", "/cgv", "/confidentialite"];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
