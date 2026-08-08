/**
 * Périmètre de la balise Google Ads : les pages publiques d'acquisition
 * uniquement. Volontairement une liste blanche — le dashboard (app/(app)),
 * l'admin (app/[adminKey]) et les vitrines clientes (app/p/[slug]) ne doivent
 * jamais charger de balise publicitaire, et une liste noire aurait raté chaque
 * nouvelle route de dashboard.
 *
 * Le chemin est comparé après retrait du préfixe de langue : /en/pricing
 * compte comme /pricing.
 */
import { hasLocale } from "@/lib/i18n/config";
const EXACT_PATHS = new Set([
  "/",
  "/pricing",
  "/commencer",
  "/cgv",
  "/confidentialite",
  "/mentions-legales",
  "/login",
]);

// `/checkout` reste dans le périmètre bien qu'il exige une session : c'est la
// page de conversion du tunnel d'acquisition, celle qui portera l'événement
// `conversion` de Google Ads. `/demo` sert les aperçus publics des vitrines.
const PREFIXES = ["/checkout", "/demo"];

function stripLocale(pathname: string): string {
  const firstSegment = pathname.split("/")[1] ?? "";
  if (!hasLocale(firstSegment)) return pathname;
  return pathname.slice(firstSegment.length + 1) || "/";
}

export function isMarketingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = stripLocale(pathname);
  if (EXACT_PATHS.has(path)) return true;
  return PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );
}
