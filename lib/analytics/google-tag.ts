/**
 * Balise Google (gtag.js) du compte Google Ads.
 *
 * L'identifiant est public (il part dans le HTML de chaque page) : il est donc
 * codé en dur comme valeur par défaut. Une variable d'environnement absente ne
 * doit plus pouvoir désactiver silencieusement la balise — c'est exactement ce
 * qui a fait échouer la détection côté Google.
 */
export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-18354292670";

export const CONSENT_STORAGE_KEY = "wayne-cookie-consent-v1";

/**
 * Snippet posé tel quel dans le <head>, avant toute hydratation React.
 *
 * Mode consentement v2 : tout est `denied` par défaut, donc aucun cookie
 * publicitaire n'est déposé tant que le visiteur n'a pas accepté la catégorie
 * « marketing » du bandeau. Le script gtag.js est bien chargé dans tous les
 * cas — c'est ce que Google exige pour valider la balise et mesurer les
 * conversions modélisées, et c'est sans dépôt de cookie tant que le
 * consentement n'est pas accordé.
 *
 * Le consentement déjà enregistré est relu ici, en synchrone, pour que la
 * bascule `granted` parte avant le premier hit (wait_for_update couvre le
 * reste, notamment l'acceptation faite dans la seconde qui suit).
 */
export const googleTagInlineScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});
try {
  var wayneConsent = JSON.parse(localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)}) || 'null');
  if (wayneConsent && wayneConsent.marketing === true) {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  }
} catch (e) {}
gtag('js', new Date());
gtag('config', ${JSON.stringify(GOOGLE_ADS_ID)});
`.trim();
