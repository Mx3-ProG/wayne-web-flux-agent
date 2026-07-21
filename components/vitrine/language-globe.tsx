"use client";

// Sélecteur de langue public, présent dans tous les headers de vitrine (nav
// personnalisée VitrineHeader + nav de repli). N'apparaît que si la boutique
// a au moins 2 langues publiées (langue principale + traductions publiées) —
// jamais pour une langue simplement "activée" mais pas encore traduite.
//
// Le lien pointe toujours vers /p/{slug}/{locale}/{currentPath} : si cette
// sous-page n'a pas de traduction publiée dans la langue cible, la route
// elle-même (app/p/[slug]/[[...segments]]/page.tsx) retombe proprement sur
// l'accueil de cette langue — pas de logique dupliquée ici.

import { useId, useState } from "react";
import { Globe } from "lucide-react";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import styles from "./vitrine.module.css";

type Props = {
  slug: string;
  currentPath: string; // '' = accueil
  locale: Locale;
  availableLocales: Locale[];
  className?: string;
};

export function LanguageGlobe({ slug, currentPath, locale, availableLocales, className }: Props) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  if (availableLocales.length < 2) return null;

  // lib/vitrine-loader.ts#availableLocales place toujours la langue
  // principale du projet en tête : c'est la seule servie sans préfixe /{locale}.
  const mainLocale = availableLocales[0];

  function hrefFor(target: Locale): string {
    const base = `/p/${slug}`;
    const localePart = target === mainLocale ? "" : `/${target}`;
    return `${base}${localePart}${currentPath ? `/${currentPath}` : ""}`;
  }

  return (
    <div className={`${styles.langSwitch} ${className ?? ""}`}>
      <button
        type="button"
        className={styles.modeToggle}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={LOCALE_LABELS[locale]}
      >
        <Globe aria-hidden="true" />
      </button>
      {open && (
        <ul id={listId} role="listbox" className={styles.langMenu} aria-label="Language">
          {availableLocales.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <a
                href={hrefFor(l)}
                className={l === locale ? styles.langMenuItemActive : styles.langMenuItem}
                onClick={() => setOpen(false)}
                lang={l}
              >
                {LOCALE_LABELS[l]}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
