import Anthropic from "@anthropic-ai/sdk";
import type { Page, Service, VoiceProfile } from "@/lib/types";
import type { Tool } from "@/lib/tools-config";
import { businessContext } from "@/lib/flux/persona";
import { KARLMADA_AI_POLICY } from "@/lib/karlmada";
import { defaultLocale, hasLocale, LOCALE_LABELS } from "@/lib/i18n/config";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const GENERATION_MODEL = "claude-sonnet-5";

// Plafonds de tokens par usage FLUX. La génération d'outils historique garde
// son propre max_tokens (2000) dans /api/generate.
export const FLUX_MAX_TOKENS = {
  prefill: 4000,
  site: 8000,
  chatTurn: 3000,
  observe: 2000,
} as const;

// Construit le prompt : contexte métier + profil de voix + données vitrine.
// Plus le commerçant a rempli sa voix, plus le contenu lui ressemble.
export async function buildPrompt(options: {
  tool: Tool;
  inputs: Record<string, string>;
  page: Page | null;
  services: Service[];
  voice: VoiceProfile | null;
}): Promise<{ system: string; user: string }> {
  const { tool, inputs, page, services, voice } = options;
  const locale = page?.default_locale && hasLocale(page.default_locale)
    ? page.default_locale
    : defaultLocale;
  const language = LOCALE_LABELS[locale];

  const parts: string[] = [
    KARLMADA_AI_POLICY,
    `Tu écris des contenus marketing en ${language} pour un commerçant indépendant. Tu écris À SA PLACE, en son nom (première personne). Réponds exclusivement en ${language}, même si le contexte contient encore des libellés internes en français.`,
    ...(await businessContext({ page, services, voice, locale })),
    "Règles : concret, direct, zéro jargon marketing, zéro phrase creuse. Le contenu doit être directement utilisable, sans retouche. Réponds en Markdown léger (titres ##, listes), sans préambule ni commentaire final.",
    `Consigne de l'outil : ${tool.systemHint}`,
  ];

  const inputLines = tool.fields
    .map((f) => {
      const value = inputs[f.id];
      if (!value) return null;
      const label =
        f.options?.find((o) => o.value === value)?.label ?? value;
      return `${f.label} : ${label}`;
    })
    .filter(Boolean);

  return {
    system: parts.join("\n\n"),
    user:
      inputLines.length > 0
        ? `Voici ma demande :\n${inputLines.join("\n")}`
        : "Propose-moi le contenu le plus utile pour remplir mon agenda cette semaine.",
  };
}
