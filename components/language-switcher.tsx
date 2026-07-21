"use client";

import { usePathname } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import {
  defaultLocale,
  hasLocale,
  localeHref,
  locales,
  LOCALE_LABELS,
  type Locale,
} from "@/lib/i18n/config";
import styles from "./language-switcher.module.css";

/**
 * Sélecteur de langue des pages marketing. Le français vit sans préfixe
 * d'URL : on y revient via ?hl=fr (proxy.ts pose le cookie et nettoie
 * l'URL) ; les autres langues sont des liens /en, /ru, /es, /zh, /ja.
 */
export function LanguageSwitcher({
  locale,
  ariaLabel,
}: {
  locale: Locale;
  ariaLabel: string;
}) {
  const pathname = usePathname() || "/";

  // Chemin canonique sans préfixe de langue.
  const first = pathname.split("/")[1] ?? "";
  const basePath = hasLocale(first)
    ? pathname.slice(first.length + 1) || "/"
    : pathname;

  function hrefFor(target: Locale): string {
    if (target === defaultLocale) {
      return `${basePath}${basePath.includes("?") ? "&" : "?"}hl=fr`;
    }
    return localeHref(target, basePath);
  }

  return (
    <details className={styles.switcher}>
      <summary aria-label={ariaLabel}>
        <Globe aria-hidden="true" />
        <span>{LOCALE_LABELS[locale]}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <ul>
        {locales.map((l) => (
          <li key={l}>
            {l === locale ? (
              <span className={styles.current} aria-current="true">
                <Check aria-hidden="true" /> {LOCALE_LABELS[l]}
              </span>
            ) : (
              // <a> volontaire (pas <Link>) : le changement de langue doit
              // repasser par proxy.ts pour poser le cookie et réécrire l'URL.
              <a href={hrefFor(l)} hrefLang={l} rel="alternate">
                {LOCALE_LABELS[l]}
              </a>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
