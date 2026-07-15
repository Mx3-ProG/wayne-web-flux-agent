// Schémas Zod — source unique de vérité pour ce que FLUX a le droit d'écrire
// dans le brouillon de la vitrine. Sert à la fois à générer les schémas JSON
// passés à l'API Anthropic (sortie structurée / tool use) et à re-valider la
// sortie du modèle côté serveur avant toute écriture (guardrails.ts).
//
// Miroir volontairement restreint de PageDraftFields (lib/types.ts) et de
// BlockSection (lib/sections.ts) : jamais de médias (logo/hero/galerie/vidéo),
// jamais d'avis clients, jamais de légal ni de retrait de branding — l'IA ne
// touche qu'au texte et aux réglages visuels.

import { z } from "zod";
import type { PageTheme } from "@/lib/types";
import { DESIGN_COMPONENTS, DESIGN_KITS, VOICE_ARCHETYPES } from "@/lib/vitrine-design/registry";

const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "couleur hexadécimale à 6 chiffres attendue");

const enumValues = <T extends string>(values: T[]) => values as [T, ...T[]];

export const PAGE_THEMES = DESIGN_KITS.map((kit) => kit.legacyTheme) satisfies PageTheme[];

export const FluxColorsSchema = z.object({
  primary: HexColor.optional(),
  dark: HexColor.optional(),
  text: HexColor.optional(),
  background: HexColor.optional(),
  card: HexColor.optional(),
  heroGradient: z.boolean().optional(),
});

export const FluxSeoSchema = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(200).optional(),
});

export const FluxPromoSchema = z.object({
  text: z.string().max(200),
  code: z.string().max(40).optional(),
  endsAt: z.string().optional(),
});

export const FluxTypographySchema = z.object({
  headingScale: z.enum(["s", "m", "l", "xl"]).optional(),
  headingFont: z.string().max(40).optional(),
});

const componentIds = (slot: string) => enumValues(DESIGN_COMPONENTS.filter((entry) => entry.slot === slot).map((entry) => entry.id));

export const FluxDesignSchema = z.object({
  kitId: z.enum(enumValues(DESIGN_KITS.map((kit) => kit.id))),
  components: z.object({
    button: z.enum(componentIds("button")).optional(),
    navigation: z.enum(componentIds("navigation")).optional(),
    header: z.enum(componentIds("header")).optional(),
    footer: z.enum(componentIds("footer")).optional(),
    section: z.enum(componentIds("section")).optional(),
    category: z.enum(componentIds("category")).optional(),
    product: z.enum(componentIds("product")).optional(),
    cart: z.enum(componentIds("cart")).optional(),
    order: z.enum(componentIds("order")).optional(),
    booking: z.enum(componentIds("booking")).optional(),
    legal: z.enum(componentIds("legal")).optional(),
    checkout: z.enum(componentIds("checkout")).optional(),
  }).optional(),
  voiceArchetypeId: z.enum(enumValues(VOICE_ARCHETYPES.map((voice) => voice.id))).optional(),
});

// Champs simples de la vitrine que FLUX peut proposer (patch partiel).
export const FluxWritableFieldsSchema = z.object({
  business_name: z.string().max(60).optional(),
  job_title: z.string().max(60).optional(),
  tagline: z.string().max(160).optional(),
  city: z.string().max(60).optional(),
  hours_text: z.string().max(500).optional(),
  offer: z.string().max(200).optional(),
  promo: FluxPromoSchema.nullable().optional(),
  seo: FluxSeoSchema.optional(),
  theme: z.enum(enumValues(PAGE_THEMES)).optional(),
  font: z.string().max(40).optional(),
  colors: FluxColorsSchema.optional(),
  typography: FluxTypographySchema.optional(),
  design: FluxDesignSchema.optional(),
});
export type FluxWritableFields = z.infer<typeof FluxWritableFieldsSchema>;

// Blocs de section que FLUX peut générer (prefill / génération de site / chat).
// Le modèle ne renvoie que type + contenu ; l'id uuid et l'objet BlockSection
// final sont fabriqués côté serveur via createBlockSection (jamais par le modèle).
export const FluxFaqItemSchema = z.object({
  question: z.string().max(200),
  answer: z.string().max(1000),
});

export const FluxGeneratedSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("texte"),
    title: z.string().max(120),
    body: z.string().max(2000),
  }),
  z.object({
    type: z.literal("a_propos"),
    title: z.string().max(120),
    body: z.string().max(2000),
  }),
  z.object({
    type: z.literal("faq"),
    title: z.string().max(120).optional(),
    items: z.array(FluxFaqItemSchema).min(1).max(10),
  }),
]);
export type FluxGeneratedSection = z.infer<typeof FluxGeneratedSectionSchema>;

// Sortie structurée du pré-remplissage IA (Phase 1). Tous les champs sont
// requis : le modèle doit produire l'ensemble, le serveur décide ensuite quoi
// appliquer (uniquement les champs vides de la vitrine + ajout des sections).
export const FluxPrefillOutputSchema = z.object({
  tagline: z.string().max(160),
  seo: z.object({
    title: z.string().max(70),
    description: z.string().max(200),
  }),
  about: z.object({
    title: z.string().max(120),
    body: z.string().max(2000),
  }),
  faq: z.array(FluxFaqItemSchema).min(3).max(5),
});
export type FluxPrefillOutput = z.infer<typeof FluxPrefillOutputSchema>;

// Sortie structurée de la génération complète par brief (Phase 2). FLUX crée
// toute la vitrine à partir du template métier + du brief : textes, SEO,
// ambiance (thème + couleurs) et 2 à 5 sections de contenu. Écrit dans le
// brouillon ; l'utilisateur relit puis publie.
export const FluxSiteOutputSchema = z.object({
  tagline: z.string().max(160),
  seo: z.object({
    title: z.string().max(70),
    description: z.string().max(200),
  }),
  theme: z.enum(enumValues(PAGE_THEMES)),
  colors: z.object({
    primary: HexColor,
    dark: HexColor,
  }),
  design: FluxDesignSchema,
  sections: z.array(FluxGeneratedSectionSchema).min(2).max(5),
});
export type FluxSiteOutput = z.infer<typeof FluxSiteOutputSchema>;

// Mots-clés que z.toJSONSchema émet mais que les sorties structurées de l'API
// refusent (400 invalid_request_error). Les envoyer casse TOUTE génération FLUX
// — c'est ce qui rendait fluxGenerateSite et fluxPrefill inutilisables.
//
// Rien n'est perdu : la sortie du modèle est de toute façon revalidée par le
// schéma Zod complet (safeParse) avant la moindre écriture. On retire ces bornes
// du schéma ENVOYÉ, pas de la validation.
const UNSUPPORTED_KEYWORDS = new Set([
  "maxLength",
  "minLength",
  "pattern",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
]);

// Les bornes retirées sont repliées dans `description` (lui, supporté) : sans
// ça le modèle ne saurait plus qu'il doit tenir en 70 caractères ou rendre 2 à
// 5 sections, et safeParse rejetterait sa sortie après coup.
function boundsHint(node: Record<string, unknown>): string | null {
  const hints: string[] = [];
  const { minLength, maxLength, minItems, maxItems } = node as {
    minLength?: number;
    maxLength?: number;
    minItems?: number;
    maxItems?: number;
  };

  if (typeof maxLength === "number" && typeof minLength === "number") {
    hints.push(`entre ${minLength} et ${maxLength} caractères`);
  } else if (typeof maxLength === "number") {
    hints.push(`${maxLength} caractères maximum`);
  } else if (typeof minLength === "number") {
    hints.push(`${minLength} caractères minimum`);
  }

  if (typeof maxItems === "number" && typeof minItems === "number") {
    hints.push(`entre ${minItems} et ${maxItems} éléments`);
  } else if (typeof maxItems === "number") {
    hints.push(`${maxItems} éléments maximum`);
  } else if (typeof minItems === "number") {
    hints.push(`${minItems} éléments minimum`);
  }

  return hints.length > 0 ? hints.join(", ") : null;
}

function adaptForAnthropic(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(adaptForAnthropic);
  if (node === null || typeof node !== "object") return node;

  const source = node as Record<string, unknown>;
  const hint = boundsHint(source);
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    // Zod émet `oneOf` pour les unions discriminées ; l'API n'accepte qu'anyOf.
    out[key === "oneOf" ? "anyOf" : key] = adaptForAnthropic(value);
  }

  if (hint) {
    const existing = typeof out.description === "string" ? out.description : "";
    out.description = existing ? `${existing} (${hint})` : hint;
  }
  return out;
}

// Convertit un schéma Zod en JSON Schema pour l'API Anthropic
// (output_config.format ou input_schema d'un tool).
//
// Le JSON Schema de Zod n'est PAS directement acceptable : il faut l'adapter aux
// restrictions des sorties structurées (voir UNSUPPORTED_KEYWORDS). Le helper
// officiel zodOutputFormat du SDK ne suffit pas — il laisse passer maxLength et
// minItems, et l'API répond alors « Schema is too complex ».
export function toAnthropicSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { unrepresentable: "any" });
  return adaptForAnthropic(json) as Record<string, unknown>;
}
