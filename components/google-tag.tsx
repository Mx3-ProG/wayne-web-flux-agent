"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isMarketingPath } from "@/lib/analytics/marketing-paths";
import type { CookiePreferences } from "./cookie-consent";

// Balise Google (gtag.js) pour Google Ads. Chargée uniquement après un
// consentement explicite « marketing » — la balise dépose des cookies
// publicitaires, elle n'entre donc pas dans l'exemption RGPD/CNIL réservée à la
// mesure d'audience anonyme. Tant que la case n'est pas cochée dans le bandeau
// (components/cookie-consent.tsx), aucune requête n'est émise vers
// googletagmanager.com.
//
// Le mode consentement v2 est déclaré malgré tout (defaults « denied » puis
// update à « granted ») : Google l'attend pour la modélisation des conversions,
// et il couvre le cas où l'utilisateur retire son consentement plus tard sans
// recharger la page.
//
// Périmètre : pages marketing seulement (voir lib/analytics/marketing-paths).
// Le filtre est ici, côté client, et non dans le root layout : celui-ci n'est
// pas re-rendu lors d'une navigation client, la balise survivrait donc à un
// passage du site vitrine vers le dashboard.

const STORAGE_KEY = "wayne-cookie-consent-v1";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function readConsent(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as CookiePreferences).marketing === true;
  } catch {
    return false;
  }
}

function pushConsentUpdate(granted: boolean) {
  const value = granted ? "granted" : "denied";
  window.dataLayer = window.dataLayer || [];
  // gtag() pousse son objet `arguments` tel quel : on reproduit la même forme
  // (tableau de type array-like) pour ne pas dépendre du script distant.
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

export function GoogleTag({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const [granted, setGranted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setGranted(readConsent());

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<CookiePreferences>).detail;
      setGranted(detail?.marketing === true);
    };
    window.addEventListener("wayne:consent", onConsent);
    return () => window.removeEventListener("wayne:consent", onConsent);
  }, []);

  const active = granted && isMarketingPath(pathname);

  // Une fois gtag.js injecté, next/script ne retire pas la balise du DOM et le
  // script reste en mémoire — sortir du périmètre (retrait du consentement, ou
  // navigation client vers le dashboard) ne suffit donc pas à le désarmer. On
  // bascule le mode consentement pour couper le dépôt de cookies, et on le
  // rétablit au retour sur une page marketing.
  useEffect(() => {
    if (loaded) pushConsentUpdate(active);
  }, [loaded, active]);

  if (!measurementId || !active) return null;

  return (
    <>
      <Script
        id="google-tag-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        onLoad={() => setLoaded(true)}
      />
      <Script id="google-tag-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied'
});
gtag('consent', 'update', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted'
});
gtag('js', new Date());
gtag('config', ${JSON.stringify(measurementId)});
        `}
      </Script>
    </>
  );
}
