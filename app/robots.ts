import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";

// robots.txt : autorise l'indexation des pages publiques + des vitrines,
// bloque les zones authentifiées, l'API et les mentions légales, et déclare
// les sitemaps (celui de l'app + ceux, éclatés, des sites utilisateurs).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Zones authentifiées (cf. PROTECTED_PREFIXES dans proxy.ts)
        "/espace",
        "/ma-page",
        "/agenda",
        "/outil",
        "/contexte",
        "/credits",
        "/resultats",
        "/compte",
        "/checkout",
        // API + parcours de connexion
        "/api/",
        "/login",
        "/auth/",
        "/mot-de-passe-oublie",
        "/reinitialiser-mot-de-passe",
        // Mentions légales : exclues volontairement de l'indexation
        "/mentions-legales",
      ],
    },
    sitemap: [`${base}/sitemap.xml`, `${base}/p/sitemap/0.xml`],
  };
}
