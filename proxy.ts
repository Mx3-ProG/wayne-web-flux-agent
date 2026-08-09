import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import {
  defaultLocale,
  hasLocale,
  locales,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";

const PROTECTED_PREFIXES = [
  "/espace",
  "/ma-page",
  "/agenda",
  "/outil",
  "/contexte",
  "/credits",
  "/resultats",
  "/compte",
  "/checkout",
];

// Pages marketing disponibles en plusieurs langues. Les URLs françaises
// restent sans préfixe ; /en, /ru, /es, /zh, /ja sont réécrits vers ces
// routes avec le header x-locale.
const LOCALIZED_PATHS = new Set([
  "/",
  "/pricing",
  "/cgv",
  "/confidentialite",
  "/mentions-legales",
  "/login",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
  "/commencer",
]);

function negotiateLocale(request: NextRequest): Locale {
  const negotiator = new Negotiator({
    headers: { "accept-language": request.headers.get("accept-language") ?? "" },
  });
  try {
    return matchLocale(
      negotiator.languages(),
      locales as unknown as string[],
      defaultLocale
    ) as Locale;
  } catch {
    return defaultLocale;
  }
}

export async function proxy(request: NextRequest) {
  const originalPath = request.nextUrl.pathname;

  // Choix explicite de langue (?hl=fr posé par le sélecteur pour revenir au
  // français, dont les URLs n'ont pas de préfixe) : cookie + URL propre.
  const hl = request.nextUrl.searchParams.get("hl");
  if (hl && hasLocale(hl)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("hl");
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(LOCALE_COOKIE, hl, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return redirect;
  }

  // --- Résolution de la langue -------------------------------------------
  let locale: Locale = defaultLocale;
  let path = originalPath; // chemin réel (sans préfixe de langue)

  const firstSegment = originalPath.split("/")[1] ?? "";
  if (hasLocale(firstSegment)) {
    const stripped = originalPath.slice(firstSegment.length + 1) || "/";
    if (firstSegment === defaultLocale) {
      // /fr/... : le français canonique vit sans préfixe.
      const url = request.nextUrl.clone();
      url.pathname = stripped;
      return NextResponse.redirect(url, 308);
    }
    if (LOCALIZED_PATHS.has(stripped)) {
      locale = firstSegment;
      path = stripped;
    } else {
      // Route non localisée (espace, tunnel…) : on retire le préfixe.
      const url = request.nextUrl.clone();
      url.pathname = stripped;
      return NextResponse.redirect(url);
    }
  } else if (originalPath === "/") {
    // Première visite : on suit le cookie, sinon la langue du navigateur.
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const preferred =
      cookieLocale && hasLocale(cookieLocale)
        ? cookieLocale
        : negotiateLocale(request);
    if (preferred !== defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${preferred}`;
      return NextResponse.redirect(url);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);
  // Chemin réel (préfixe de langue retiré). Sert de discriminant au root
  // layout pour la balise Google Ads : les vitrines clientes (/p/…) sont hors
  // du matcher ci-dessous, elles n'ont donc pas ce header — et pas de balise.
  requestHeaders.set("x-pathname", path);

  // --- Session Supabase ---------------------------------------------------
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // /commencer n'est PAS listé ici : le tunnel se joue désormais connecté (le
  // compte est créé à son premier écran). La page gère elle-même les deux états
  // — visiteur → création de compte, connecté → suite du Parcours — et renvoie
  // vers /espace une fois le Parcours terminé.
  if (path === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/espace";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // --- Réécriture des URLs localisées ------------------------------------
  if (path !== originalPath) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const rewritten = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    for (const cookie of response.cookies.getAll()) {
      rewritten.cookies.set(cookie);
    }
    response = rewritten;
  }

  // Mémorise la langue choisie via la navigation (le sélecteur pose des
  // liens /en/…) pour la redirection automatique sur "/".
  if (locale !== defaultLocale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|p/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
