import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada-constants";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/config";
import {
  ILLICIT_TERMS,
  ILLICIT_TERMS_COMMON,
  type IllicitCategory,
} from "@/lib/karlmada-terms";

export { KARLMADA_BLOCK_MESSAGE };

type KarlMadaMatch = {
  category: IllicitCategory;
  rule: string;
};

// Langues à écriture latine : matching MOT-ENTIER après normalisation (accents
// + leetspeak). Les autres (ru, zh, ja, ar) utilisent le matching en sous-chaîne
// (normalizeUnicode) car il n'y a pas de frontières de mots exploitables — et le
// leetspeak n'y a pas de sens.
const LATIN_LOCALES: ReadonlySet<Locale> = new Set<Locale>([
  "fr", "en", "es", "de", "it",
]);

// Normalisation latine : neutralise accents et leetspeak, réduit à [a-z0-9] +
// espaces. Sert au matching mot-entier des langues latines ET des termes
// universels (ILLICIT_TERMS_COMMON), qui apparaissent souvent en caractères
// latins même au sein d'un texte non latin.
function normalizeLatin(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4|@/g, "a")
    .replace(/5|\$/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Normalisation « tous scripts » : conserve les lettres (cyrillique, CJK, arabe),
// passe en minuscules, retire les diacritiques arabes et le tatweel, compacte les
// espaces. Sert au matching en sous-chaîne des langues non latines.
function normalizeUnicode(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 8 || value == null) return;
  if (typeof value === "string") {
    if (value.trim()) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, out, depth + 1);
    }
  }
}

// Contrôle un texte contre un groupe de termes selon la stratégie du script.
function matchGroups(
  latinText: string,
  unicodeText: string,
  groups: readonly { category: IllicitCategory; terms: readonly string[] }[],
  latinStrategy: boolean
): KarlMadaMatch | null {
  const paddedLatin = ` ${latinText} `;
  for (const group of groups) {
    for (const term of group.terms) {
      if (latinStrategy) {
        // Mot-entier : le terme normalisé doit apparaître entouré d'espaces.
        if (paddedLatin.includes(` ${normalizeLatin(term)} `)) {
          return { category: group.category, rule: term };
        }
      } else {
        // Sous-chaîne : pas de frontières de mots en CJK/arabe/cyrillique.
        const needle = normalizeUnicode(term);
        if (needle && unicodeText.includes(needle)) {
          return { category: group.category, rule: term };
        }
      }
    }
  }
  return null;
}

// Vérifie le contenu contre la bibliothèque de la LANGUE de la page (plus jamais
// le mélange global multi-langues) + les termes universels (latins) sur tout
// contenu, quelle que soit sa langue.
export function inspectWithKarlMada(
  value: unknown,
  locale: Locale = defaultLocale
): KarlMadaMatch | null {
  const strings: string[] = [];
  collectStrings(value, strings);

  const localeGroups = ILLICIT_TERMS[locale] ?? ILLICIT_TERMS[defaultLocale];
  const isLatin = LATIN_LOCALES.has(locale);

  for (const raw of strings) {
    const latinText = normalizeLatin(raw);
    const unicodeText = isLatin ? "" : normalizeUnicode(raw);

    // 1. Termes universels : toujours en latin/mot-entier (ils s'écrivent en
    //    caractères latins même dans un texte non latin, ex. « MDMA »).
    const common = matchGroups(latinText, "", ILLICIT_TERMS_COMMON, true);
    if (common) return common;

    // 2. Termes propres à la langue de la page, selon son script.
    const localeMatch = matchGroups(latinText, unicodeText, localeGroups, isLatin);
    if (localeMatch) return localeMatch;
  }
  return null;
}

// Seuil et fenêtre glissante avant suspension automatique. On ne compte que les
// blocages récents : des faux positifs isolés étalés sur des mois ne doivent
// jamais cumuler jusqu'à la sanction.
const SUSPENSION_THRESHOLD = 3;
const SUSPENSION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type KarlMadaContext = {
  userId?: string | null;
  pageId?: string | null;
  // Langue du contenu à modérer. Si absente mais pageId fourni, on lit
  // pages.default_locale ; sinon on retombe sur la langue par défaut.
  locale?: Locale | string | null;
  surface: string;
};

export async function enforceKarlMada(
  value: unknown,
  context: KarlMadaContext
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Résolution de la langue à contrôler : explicite → via la page → défaut.
  let locale: Locale = defaultLocale;
  if (context.locale && hasLocale(context.locale)) {
    locale = context.locale;
  } else if (context.pageId) {
    try {
      const { data: page } = await admin
        .from("pages")
        .select("default_locale")
        .eq("id", context.pageId)
        .maybeSingle<{ default_locale: string | null }>();
      if (page?.default_locale && hasLocale(page.default_locale)) {
        locale = page.default_locale;
      }
    } catch {
      // Langue par défaut : ne bloque jamais la modération sur une erreur de lecture.
    }
  }

  const match = inspectWithKarlMada(value, locale);
  if (!match) return {};

  // Best effort : un problème de journalisation ne doit jamais autoriser le contenu.
  try {
    let userId = context.userId ?? null;
    if (!userId && context.pageId) {
      const { data: owner } = await admin
        .from("pages")
        .select("user_id")
        .eq("id", context.pageId)
        .maybeSingle();
      userId = owner?.user_id ?? null;
    }

    const { error: insertError } = await admin.from("karlmada_events").insert({
      user_id: userId,
      page_id: context.pageId ?? null,
      surface: context.surface.slice(0, 80),
      category: match.category,
      rule_code: match.rule.slice(0, 80),
      action: "blocked",
    });

    if (!insertError && userId) {
      const since = new Date(Date.now() - SUSPENSION_WINDOW_MS).toISOString();
      const { count } = await admin
        .from("karlmada_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "blocked")
        .gte("created_at", since);
      if ((count ?? 0) >= SUSPENSION_THRESHOLD) {
        // Suspension RÉVERSIBLE, jamais de suppression : l'IA et la publication
        // sont coupées et un admin tranche (réactivation possible). On ne
        // réécrit pas une suspension déjà posée.
        await admin
          .from("profiles")
          .update({
            suspended_at: new Date().toISOString(),
            suspended_reason: `KarlMada : ${SUSPENSION_THRESHOLD} blocages en 30 jours (dernier : ${match.category}).`,
          })
          .eq("user_id", userId)
          .is("suspended_at", null);
      }
    }
  } catch {
    // Le blocage reste fail-closed même si la table d'audit est indisponible.
  }

  return { error: KARLMADA_BLOCK_MESSAGE };
}

export const KARLMADA_AI_POLICY = `
POLITIQUE KARLMADA — PRIORITÉ ABSOLUE :
- Refuse de créer, promouvoir, optimiser ou faciliter tout contenu pour adultes, toute drogue ou substance illicite, toute arme, fraude, contrefaçon, violence criminelle ou activité contraire à la loi.
- Ne reformule jamais une demande interdite pour la rendre publiable et n'explique pas comment contourner ces contrôles.
- Si le contexte utilisateur contient de tels éléments, réponds uniquement par un refus bref et sûr. Ne les réutilise pas dans une génération.
`;
