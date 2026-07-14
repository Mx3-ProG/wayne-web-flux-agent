import "server-only";

import { createBlockSection, validateSections, type BlockSectionType, type PageSection } from "@/lib/sections";
import { FluxWritableFieldsSchema, type FluxGeneratedSection } from "@/lib/flux/schemas";
import type { PageDraftFields } from "@/lib/types";

// Un patch FLUX = des champs simples de la vitrine + éventuellement une liste
// complète de sections déjà résolue (natives + blocs). Jamais de médias.
export type FluxDraftPatch = {
  fields?: Record<string, unknown>;
  sections?: PageSection[];
};

export type ValidateResult =
  | { ok: true; patch: Partial<PageDraftFields> }
  | { ok: false; error: string };

// Filtre + valide tout ce que FLUX veut écrire AVANT le merge dans le brouillon.
// - les champs passent par le schéma Zod (les clés inconnues sont retirées) ;
// - les sections passent par validateSections (mêmes bornes que l'éditeur, refus
//   des URLs de fond hors Storage).
export function validateDraftPatch(patch: FluxDraftPatch): ValidateResult {
  const out: Partial<PageDraftFields> = {};

  if (patch.fields) {
    const parsed = FluxWritableFieldsSchema.safeParse(patch.fields);
    if (!parsed.success) {
      return { ok: false, error: "Champs générés invalides." };
    }
    // parsed.data ne contient que les clés autorisées (Zod strippe le reste).
    Object.assign(out, parsed.data);
  }

  if (patch.sections) {
    const sectionsError = validateSections(patch.sections);
    if (sectionsError) return { ok: false, error: sectionsError };
    out.sections = patch.sections;
  }

  return { ok: true, patch: out };
}

// Fabrique un BlockSection complet (id uuid généré serveur) à partir d'une
// section générée par le modèle. Le modèle ne fournit jamais d'id ni d'URL.
export function buildGeneratedSection(section: FluxGeneratedSection): PageSection {
  const base = createBlockSection(section.type as BlockSectionType);
  switch (section.type) {
    case "texte":
      return { ...base, type: "texte", settings: { title: section.title, body: section.body } };
    case "a_propos":
      return {
        ...base,
        type: "a_propos",
        settings: { photoUrl: null, title: section.title, body: section.body },
      };
    case "faq":
      return {
        ...base,
        type: "faq",
        settings: { title: section.title, items: section.items },
      };
  }
}
