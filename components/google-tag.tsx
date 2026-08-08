import {
  GOOGLE_ADS_ID,
  googleTagInlineScript,
} from "@/lib/analytics/google-tag";
import { GoogleTagConsent } from "./google-tag-consent";

// Balise Google (gtag.js) du compte Google Ads, sur toutes les pages.
//
// Balises <script> brutes, volontairement : `next/script` en
// `strategy="beforeInteractive"` n'émet qu'un `<link rel="preload">` dans le
// HTML servi et n'exécute le code qu'à l'hydratation — le vérificateur de
// Google ne détectait donc aucune balise. Ici le HTML rendu par le serveur
// contient le vrai `<script src="…/gtag/js?id=…">`, que React 19 remonte dans
// le <head>, précédé du snippet d'initialisation.
//
// RGPD : mode consentement v2 avec tout en `denied` par défaut (voir
// lib/analytics/google-tag.ts). Le script est chargé sur chaque page, mais
// aucun cookie publicitaire n'est déposé tant que la catégorie « marketing »
// du bandeau n'est pas acceptée ; GoogleTagConsent répercute le choix à chaud.
export function GoogleTag() {
  if (!GOOGLE_ADS_ID) return null;

  return (
    <>
      {/* Google tag (gtag.js) */}
      <script
        id="google-tag-init"
        dangerouslySetInnerHTML={{ __html: googleTagInlineScript }}
      />
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
      />
      <GoogleTagConsent />
    </>
  );
}
