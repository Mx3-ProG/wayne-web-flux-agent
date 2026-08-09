import "server-only";
import { headers } from "next/headers";

/**
 * La balise Google Ads est posée sur le site Wayne Web Flux, jamais sur les
 * vitrines clientes (/p/[slug]) : leur trafic n'a rien à faire dans nos
 * conversions.
 *
 * Discriminant : le header `x-pathname` posé par proxy.ts. Le matcher du proxy
 * exclut `/p/` (et `api/`, et les fichiers statiques) — une page HTML sans ce
 * header est donc une vitrine. Le test du préfixe est conservé par sécurité au
 * cas où le matcher évoluerait.
 *
 * Conséquence assumée : si le proxy ne tournait pas, la balise disparaîtrait.
 * C'est vérifié sur le HTML de production à chaque déploiement (voir le
 * contrôle décrit dans le commit qui introduit ce fichier).
 */
export async function shouldLoadGoogleTag(): Promise<boolean> {
  const pathname = (await headers()).get("x-pathname");
  if (!pathname) return false;
  return pathname !== "/p" && !pathname.startsWith("/p/");
}
