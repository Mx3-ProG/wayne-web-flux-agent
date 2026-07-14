import "server-only";

import profanity from "leo-profanity";
import { createAdminClient } from "@/lib/supabase/admin";

export const KARLMADA_BLOCK_MESSAGE =
  "Les messages de haines ou les contenus explicit sont interdit et amendé sur FLUX, veuillez respectez votre environnement et celui des autres. 3 Infractions contre nos conditions d'utilisations le compte est supprimé.";

type KarlMadaCategory = "adult" | "drugs" | "weapons" | "illegal" | "profanity";

type KarlMadaMatch = {
  category: KarlMadaCategory;
  rule: string;
};

// Les listes de leo-profanity (Shutterstock + dictionnaire français) complètent
// nos règles métier. Les termes restent côté serveur afin de ne pas fournir une
// liste de contournement au navigateur.
profanity.loadDictionary("en");
profanity.add(profanity.getDictionary("fr"));

const RULES: ReadonlyArray<{
  category: Exclude<KarlMadaCategory, "profanity">;
  terms: readonly string[];
}> = [
  {
    category: "adult",
    terms: [
      "porn", "pornographie", "porno", "escort", "escorte sexuelle", "camgirl",
      "cam boy", "onlyfans", "massage erotique", "service sexuel", "contenu adulte",
      "nude", "nudite explicite", "hentai", "prostitution",
    ],
  },
  {
    category: "drugs",
    terms: [
      "cannabis", "marijuana", "haschich", "cocaine", "heroine", "methamphetamine",
      "ecstasy", "mdma", "lsd", "fentanyl", "ketamine", "crack", "dealer",
      "drogue", "drogues", "vente de drogue", "stupéfiant", "stupefiant",
    ],
  },
  {
    category: "weapons",
    terms: [
      "arme a feu", "pistolet", "revolver", "fusil d assaut", "kalachnikov", "ak47",
      "munition", "explosif", "grenade", "bombe artisanale", "silencieux", "taser",
      "arme", "armes", "poing americain", "vente d arme", "vente arme",
    ],
  },
  {
    category: "illegal",
    terms: [
      "faux papiers", "carte bancaire volee", "carte bancaire volee", "blanchiment",
      "contrefacon", "ransomware", "malware", "phishing", "piratage de compte",
      "service de piratage", "données volées", "donnees volees", "traite humaine",
      "esclavage", "tueur a gages", "fraude fiscale", "achat de votes", "activité illicite",
      "activite illicite", "produit illicite", "service illicite",
    ],
  },
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
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

export function inspectWithKarlMada(value: unknown): KarlMadaMatch | null {
  const strings: string[] = [];
  collectStrings(value, strings);

  for (const raw of strings) {
    const text = normalize(raw);
    for (const group of RULES) {
      const paddedText = ` ${text} `;
      const rule = group.terms.find((term) =>
        paddedText.includes(` ${normalize(term)} `)
      );
      if (rule) return { category: group.category, rule };
    }
    if (profanity.check(text)) {
      return { category: "profanity", rule: "library-match" };
    }
  }
  return null;
}

export async function enforceKarlMada(
  value: unknown,
  context: { userId?: string | null; pageId?: string | null; surface: string }
): Promise<{ error?: string }> {
  const match = inspectWithKarlMada(value);
  if (!match) return {};

  // Best effort : un problème de journalisation ne doit jamais autoriser le contenu.
  try {
    const admin = createAdminClient();
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
      const { count } = await admin
        .from("karlmada_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "blocked");
      if ((count ?? 0) >= 3) {
        await admin.auth.admin.deleteUser(userId);
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
