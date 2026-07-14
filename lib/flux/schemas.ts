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

const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "couleur hexadécimale à 6 chiffres attendue");

export const PAGE_THEMES = [
  "editorial",
  "studio",
  "local",
  "bold",
  "luxe",
  "minimal",
  "neon",
  "prestige",
] as const satisfies readonly PageTheme[];

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
  theme: z.enum(PAGE_THEMES).optional(),
  font: z.string().max(40).optional(),
  colors: FluxColorsSchema.optional(),
  typography: FluxTypographySchema.optional(),
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

// Convertit un schéma Zod en JSON Schema pour l'API Anthropic
// (output_config.format ou input_schema d'un tool).
export function toAnthropicSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
}
