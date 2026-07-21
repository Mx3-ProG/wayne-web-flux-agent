"use client";

import Link from "next/link";
import { BarChart3, Check, Cookie, Megaphone, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./cookie-consent.module.css";
import { LOCALE_BCP47, locales, type Locale } from "@/lib/i18n/config";
import frCommon from "@/lib/i18n/dictionaries/fr/common.json";
import enCommon from "@/lib/i18n/dictionaries/en/common.json";
import esCommon from "@/lib/i18n/dictionaries/es/common.json";
import deCommon from "@/lib/i18n/dictionaries/de/common.json";
import itCommon from "@/lib/i18n/dictionaries/it/common.json";
import ruCommon from "@/lib/i18n/dictionaries/ru/common.json";
import zhCommon from "@/lib/i18n/dictionaries/zh/common.json";
import jaCommon from "@/lib/i18n/dictionaries/ja/common.json";
import arCommon from "@/lib/i18n/dictionaries/ar/common.json";

const DICTS: Record<Locale, typeof frCommon> = {
  fr: frCommon,
  en: enCommon,
  es: esCommon,
  de: deCommon,
  it: itCommon,
  ru: ruCommon,
  zh: zhCommon,
  ja: jaCommon,
  ar: arCommon,
};

// Bandeau global (root layout, marketing + dashboard confondus) : pas de
// contexte serveur commun aux deux, donc même stratégie que error-screen.tsx —
// lire <html lang>, déjà posé par I18nProvider (dashboard) ou le layout
// marketing, via useSyncExternalStore (pas de mismatch d'hydratation).
function subscribe(): () => void {
  return () => {};
}
function getSnapshot(): Locale {
  const htmlLang = document.documentElement.lang;
  return locales.find((locale) => LOCALE_BCP47[locale] === htmlLang) ?? "fr";
}
function getServerSnapshot(): Locale {
  return "fr";
}

const STORAGE_KEY = "wayne-cookie-consent-v1";

export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  updatedAt: string;
};

type OptionalPreference = "analytics" | "personalization" | "marketing";

const initialOptional = { analytics: false, personalization: false, marketing: false };

function persistConsent(optional: typeof initialOptional) {
  const preferences: CookiePreferences = {
    necessary: true,
    ...optional,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent<CookiePreferences>("wayne:consent", { detail: preferences }));
}

export function CookieConsent() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = DICTS[locale].cookieConsent;
  const categories: Array<{
    key: "necessary" | OptionalPreference;
    title: string;
    description: string;
    icon: typeof ShieldCheck;
  }> = [
    { key: "necessary", ...t.categories.necessary, icon: ShieldCheck },
    { key: "analytics", ...t.categories.analytics, icon: BarChart3 },
    { key: "personalization", ...t.categories.personalization, icon: Sparkles },
    { key: "marketing", ...t.categories.marketing, icon: Megaphone },
  ];
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] = useState(initialOptional);

  useEffect(() => {
    let frame: number;
    try {
      const shouldOpen = !localStorage.getItem(STORAGE_KEY);
      frame = window.requestAnimationFrame(() => {
        setVisible(shouldOpen);
        setReady(true);
      });
    } catch {
      frame = window.requestAnimationFrame(() => {
        setVisible(true);
        setReady(true);
      });
    }

    const openPreferences = () => setVisible(true);
    window.addEventListener("wayne:open-cookie-preferences", openPreferences);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("wayne:open-cookie-preferences", openPreferences);
    };
  }, []);

  function save(optional: typeof initialOptional) {
    try {
      persistConsent(optional);
    } finally {
      setVisible(false);
      setCustomizing(false);
    }
  }

  function toggle(key: OptionalPreference) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  if (!ready || !visible) return null;

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-title"
        aria-describedby="cookie-description"
      >
        <div className={styles.icon}><Cookie aria-hidden="true" /></div>
        <div className={styles.content}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id="cookie-title">{t.title}</h2>
          <p id="cookie-description">{t.description}</p>

          {customizing && (
            <div className={styles.preferences} aria-label={t.preferencesAria}>
              {categories.map(({ key, title, description, icon: Icon }) => {
                const required = key === "necessary";
                const enabled = required || preferences[key];
                return (
                  <div className={styles.preference} key={key}>
                    <Icon aria-hidden="true" />
                    <span><strong>{title}</strong><small>{description}</small></span>
                    <button
                      className={styles.switch}
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={t.toggleAria
                        .replace("{title}", title)
                        .replace("{state}", enabled ? t.enabled : t.disabled)}
                      disabled={required}
                      data-active={enabled}
                      onClick={() => !required && toggle(key)}
                    >
                      <span>{enabled && <Check aria-hidden="true" />}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className={styles.legal}>
            {t.legalPrefix} <Link href="/confidentialite">{t.privacyPolicy}</Link>.
          </p>
        </div>

        <div className={styles.actions}>
          <button className={`flux-button-smooth ${styles.accept}`} type="button" onClick={() => save({ analytics: true, personalization: true, marketing: true })}>
            {t.acceptAll} <Check aria-hidden="true" />
          </button>
          {customizing ? (
            <button className={styles.customize} type="button" onClick={() => save(preferences)}>
              {t.saveChoices}
            </button>
          ) : (
            <button className={styles.customize} type="button" onClick={() => setCustomizing(true)}>
              <Settings2 aria-hidden="true" /> {t.customize}
            </button>
          )}
          <button className={styles.decline} type="button" onClick={() => save(initialOptional)}>
            {t.declineOptional} <X aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
