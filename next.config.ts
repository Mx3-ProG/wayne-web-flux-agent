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
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://player.vimeo.com https://www.youtube-nocookie.com https://www.youtube.com",
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
