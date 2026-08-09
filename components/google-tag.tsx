import {
  GOOGLE_ADS_ID,
  googleTagInlineScript,
} from "@/lib/analytics/google-tag";

// Balise Google (gtag.js) du compte Google Ads.
//
// Rendu dans le <head> du root layout, juste après son ouverture, exactement
// comme l'indique Google. Balises <script> brutes, volontairement : next/script
// en `strategy="beforeInteractive"` n'émet qu'un `<link rel="preload">` dans le
// HTML servi et n'exécute le code qu'à l'hydratation — le vérificateur de
// Google n'y voyait aucune balise.
//
// RGPD : mode consentement v2 avec tout en `denied` par défaut (voir
// lib/analytics/google-tag.ts). Le script est chargé, mais aucun cookie
// publicitaire n'est déposé tant que la catégorie « marketing » du bandeau
// n'est pas acceptée ; GoogleTagConsent (dans <body>) répercute le choix à
// chaud.
export function GoogleTag() {
  if (!GOOGLE_ADS_ID) return null;

  return (
    <>
      {/* Google tag (gtag.js) */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
      />
      <script dangerouslySetInnerHTML={{ __html: googleTagInlineScript }} />
    </>
  );
}
