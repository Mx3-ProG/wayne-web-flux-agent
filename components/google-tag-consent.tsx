"use client";

import { useEffect } from "react";
import type { CookiePreferences } from "./cookie-consent";

// Répercute le choix du bandeau cookies sur le mode consentement Google, sans
// rechargement : la balise est déjà chargée (defaults `denied`), on bascule
// simplement `granted`/`denied` à chaque changement.
declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function pushConsentUpdate(granted: boolean) {
  const value = granted ? "granted" : "denied";
  window.dataLayer = window.dataLayer || [];
  // gtag() pousse son objet `arguments` : on reproduit la même forme pour ne
  // pas dépendre de la présence du script distant.
  window.dataLayer.push([
    "consent",
    "update",
    {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    },
  ]);
}

export function GoogleTagConsent() {
  useEffect(() => {
    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<CookiePreferences>).detail;
      pushConsentUpdate(detail?.marketing === true);
    };
    window.addEventListener("wayne:consent", onConsent);
    return () => window.removeEventListener("wayne:consent", onConsent);
  }, []);

  return null;
}
