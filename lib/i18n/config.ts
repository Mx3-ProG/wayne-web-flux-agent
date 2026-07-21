export const locales = [
  "fr",
  "en",
  "es",
  "de",
  "it",
  "ru",
  "zh",
  "ja",
  "ar",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Nom de chaque langue, dans sa propre langue (affiché dans le sélecteur). */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  ar: "العربية",
};

/** Code BCP 47 complet pour <html lang>, Open Graph et Intl. */
export const LOCALE_BCP47: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  ru: "ru-RU",
  zh: "zh-CN",
  ja: "ja-JP",
  ar: "ar-SA",
};

export const LOCALE_OG: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
  it: "it_IT",
  ru: "ru_RU",
  zh: "zh_CN",
  ja: "ja_JP",
  ar: "ar_SA",
};

/** Sens d'écriture. Seul l'arabe est RTL parmi les neuf langues supportées. */
export const LOCALE_DIR: Record<Locale, "ltr" | "rtl"> = {
  fr: "ltr",
  en: "ltr",
  es: "ltr",
  de: "ltr",
  it: "ltr",
  ru: "ltr",
  zh: "ltr",
  ja: "ltr",
  ar: "rtl",
};

export function isRtl(locale: Locale): boolean {
  return LOCALE_DIR[locale] === "rtl";
}

/**
 * Le français est servi sans préfixe (URLs historiques inchangées) ; les
 * autres langues vivent sous /en, /es, /de, /it, /ru, /zh, /ja, /ar.
 */
export function localeHref(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export const LOCALE_COOKIE = "NEXT_LOCALE";
