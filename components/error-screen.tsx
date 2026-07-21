"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { LayoutDashboard, RefreshCw, TriangleAlert } from "lucide-react";
import styles from "./error-screen.module.css";
import { LOCALE_BCP47, locales, type Locale } from "@/lib/i18n/config";
import frErrors from "@/lib/i18n/dictionaries/fr/errors.json";
import enErrors from "@/lib/i18n/dictionaries/en/errors.json";
import esErrors from "@/lib/i18n/dictionaries/es/errors.json";
import deErrors from "@/lib/i18n/dictionaries/de/errors.json";
import itErrors from "@/lib/i18n/dictionaries/it/errors.json";
import ruErrors from "@/lib/i18n/dictionaries/ru/errors.json";
import zhErrors from "@/lib/i18n/dictionaries/zh/errors.json";
import jaErrors from "@/lib/i18n/dictionaries/ja/errors.json";
import arErrors from "@/lib/i18n/dictionaries/ar/errors.json";

const DICTS: Record<Locale, typeof frErrors> = {
  fr: frErrors,
  en: enErrors,
  es: esErrors,
  de: deErrors,
  it: itErrors,
  ru: ruErrors,
  zh: zhErrors,
  ja: jaErrors,
  ar: arErrors,
};

// Pas de contexte serveur ici (boundary d'erreur runtime + 404, déclenchables
// pour un visiteur anonyme comme pour un compte connecté) : on résout la
// langue depuis <html lang>, déjà posée par I18nProvider (dashboard) ou le
// layout racine (site marketing). useSyncExternalStore lit cette source
// externe sans mismatch d'hydratation (SSR retombe sur le français, puis se
// resynchronise après montage si le client résout une autre langue).
function subscribe(): () => void {
  // <html lang> ne change pas après le montage dans cette app : rien à observer.
  return () => {};
}

function getSnapshot(): Locale {
  const htmlLang = document.documentElement.lang;
  return locales.find((locale) => LOCALE_BCP47[locale] === htmlLang) ?? "fr";
}

function getServerSnapshot(): Locale {
  return "fr";
}

// Écran d'erreur commun : 404 (not-found.tsx) et erreurs runtime (error.tsx).
// Deux sorties : recharger la page, ou retourner au dashboard (/espace —
// redirige vers /login si l'utilisateur n'est pas connecté).
export function ErrorScreen() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = DICTS[locale];

  return (
    <div className={styles.screen}>
      <span className={styles.icon}><TriangleAlert aria-hidden="true" /></span>
      <p className={styles.kicker}>{t.kicker}</p>
      <h1>{t.titleStart} <em>{t.titleEm}</em></h1>
      <p className={styles.text}>{t.text}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={`flux-button-smooth ${styles.primary}`}
          onClick={() => window.location.reload()}
        >
          <RefreshCw aria-hidden="true" /> {t.reload}
        </button>
        <Link href="/espace" className={styles.secondary}>
          <LayoutDashboard aria-hidden="true" /> {t.dashboard}
        </Link>
      </div>
    </div>
  );
}
