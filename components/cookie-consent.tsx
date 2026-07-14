"use client";

import Link from "next/link";
import { BarChart3, Check, Cookie, Megaphone, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./cookie-consent.module.css";

const STORAGE_KEY = "wayne-cookie-consent-v1";

export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  updatedAt: string;
};

type OptionalPreference = "analytics" | "personalization" | "marketing";

const categories: Array<{
  key: "necessary" | OptionalPreference;
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  {
    key: "necessary",
    title: "Nécessaires",
    description: "Connexion, sécurité et fonctionnement du service.",
    icon: ShieldCheck,
  },
  {
    key: "analytics",
    title: "Mesure d’audience",
    description: "Comprendre les usages et améliorer la qualité du service.",
    icon: BarChart3,
  },
  {
    key: "personalization",
    title: "Personnalisation",
    description: "Adapter l’expérience et les contenus à tes préférences.",
    icon: Sparkles,
  },
  {
    key: "marketing",
    title: "Notoriété",
    description: "Mesurer nos campagnes et faire connaître nos services.",
    icon: Megaphone,
  },
];

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

  if (!ready) return null;
  if (!visible) {
    return (
      <button className={styles.reopen} type="button" onClick={() => setVisible(true)} aria-label="Gérer mes préférences de cookies">
        <Cookie aria-hidden="true" /> <span>Cookies</span>
      </button>
    );
  }

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
          <p className={styles.kicker}>Ton choix, simplement</p>
          <h2 id="cookie-title">Des cookies pour un service qui progresse.</h2>
          <p id="cookie-description">
            Nous utilisons des cookies optionnels pour comprendre ce qui t’est utile,
            améliorer Flux et développer sa notoriété. Tu gardes le contrôle.
          </p>

          {customizing && (
            <div className={styles.preferences} aria-label="Préférences de cookies">
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
                      aria-label={`${title} : ${enabled ? "activé" : "désactivé"}`}
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
            Les cookies nécessaires restent actifs. Consulte notre <Link href="/confidentialite">politique de confidentialité</Link>.
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.accept} type="button" onClick={() => save({ analytics: true, personalization: true, marketing: true })}>
            Tout accepter <Check aria-hidden="true" />
          </button>
          {customizing ? (
            <button className={styles.customize} type="button" onClick={() => save(preferences)}>
              Enregistrer mes choix
            </button>
          ) : (
            <button className={styles.customize} type="button" onClick={() => setCustomizing(true)}>
              <Settings2 aria-hidden="true" /> Personnaliser
            </button>
          )}
          <button className={styles.decline} type="button" onClick={() => save(initialOptional)}>
            Continuer sans accepter <X aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
