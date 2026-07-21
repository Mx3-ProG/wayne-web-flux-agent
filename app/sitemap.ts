import type { MetadataRoute } from "next";
import { locales, localeHref } from "@/lib/i18n/config";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";

// Sitemap des pages publiques de l'application (hors zones authentifiées).
// Les vitrines des utilisateurs sont dans app/p/sitemap.ts.
// Les pages marketing existent dans les 6 langues (fr sans préfixe).
const LOCALIZED_ROUTES = ["/", "/pricing", "/cgv", "/confidentialite"];
const FRENCH_ONLY_ROUTES = ["/commencer", "/formules"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const localized = LOCALIZED_ROUTES.flatMap((path) => {
    const alternates: Record<string, string> = {};
    for (const l of locales) alternates[l] = `${base}${localeHref(l, path)}`;
    return locales.map((locale) => ({
      url: `${base}${localeHref(locale, path)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: { languages: alternates },
    }));
  });

  const frenchOnly = FRENCH_ONLY_ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...localized, ...frenchOnly];
}
