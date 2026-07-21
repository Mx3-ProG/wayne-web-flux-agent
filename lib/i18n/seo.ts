import { locales, localeHref, type Locale } from "./config";

/**
 * Alternates hreflang pour une page marketing. `path` est le chemin
 * canonique sans préfixe de langue (ex. "/pricing").
 */
export function languageAlternates(locale: Locale, path: string) {
  const languages: Record<string, string> = { "x-default": localeHref("fr", path) };
  for (const l of locales) languages[l] = localeHref(l, path);
  return {
    canonical: localeHref(locale, path),
    languages,
  };
}
