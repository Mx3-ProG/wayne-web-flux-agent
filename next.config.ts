import type { NextConfig } from "next";

// Politique de sécurité de contenu. Volontairement permissive sur les médias
// (les vitrines sont générées par les utilisateurs : images/vidéos externes,
// embeds YouTube/Vimeo) mais stricte sur les scripts et le cadrage (anti-XSS,
// anti-clickjacking). Stripe (js.stripe.com + iframes) et Supabase (REST,
// Realtime en wss, Storage) sont explicitement autorisés.
// NB : `'unsafe-inline'` sur script-src reste nécessaire tant que l'hydratation
// Next.js n'est pas passée aux nonces — voir suivi audit. Il bloque déjà toute
// injection de <script src> externe, ce qui ferme le vecteur XSS principal.
// React utilise eval() en mode développement (reconstruction de call-stacks,
// overlay d'erreurs). Jamais en production. On l'autorise donc uniquement en dev.
const stripeScript = "https://js.stripe.com https://*.js.stripe.com";
// Balise Google Ads (gtag.js), chargée seulement après consentement marketing
// — voir components/google-tag.tsx.
// gtag.js injecte à son tour le script de conversion (googleads.g.doubleclick.net
// / googleadservices.com) : sans ces deux origines, la conversion est bloquée.
const googleTagScript =
  "https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.googleadservices.com";
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${stripeScript} ${googleTagScript}`
    : `script-src 'self' 'unsafe-inline' ${stripeScript} ${googleTagScript}`;

// Remontée des conversions Google Ads : gtag.js poste vers googletagmanager /
// google-analytics, puis vers les domaines de conversion (google.com,
// googleadservices.com, doubleclick.net).
const googleTagConnect =
  "https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.google.com https://*.doubleclick.net https://www.googleadservices.com";

// Stripe. `js.stripe.com` sert Stripe.js et les iframes d'Elements ; les
// sous-domaines `*.js.stripe.com` servent les ressources récentes.
// `m.stripe.network` porte la détection de fraude, `r.stripe.com` la remontée
// d'erreurs, et `maps.googleapis.com` l'autocomplétion d'adresse du
// BillingAddressElement — sans eux le paiement fonctionne mais dégradé
// (signaux anti-fraude absents, saisie d'adresse entièrement manuelle).
const stripeFrame =
  "https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://m.stripe.network";
const stripeConnect =
  "https://api.stripe.com https://m.stripe.network https://r.stripe.com https://maps.googleapis.com";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${stripeConnect} ${googleTagConnect}`,
  // `'self'` est indispensable : la page d'accueil encadre ses propres démos
  // (<iframe src="/demo/…">). Sans lui le navigateur bloque le cadrage et
  // laisse un rectangle blanc à la place de l'aperçu.
  // Les sections « Carte » utilisent l'embed public de Google Maps depuis
  // www.google.com (sans clé API). `connect-src maps.googleapis.com` ne couvre
  // pas cet iframe : son origine doit être autorisée explicitement ici.
  // `td.doubleclick.net` : iframe de synchronisation des conversions Google Ads.
  `frame-src 'self' ${stripeFrame} https://td.doubleclick.net https://www.googletagmanager.com https://www.google.com https://player.vimeo.com https://www.youtube-nocookie.com https://www.youtube.com`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
