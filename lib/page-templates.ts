// Modèles de sous-pages proposés à la création (modèle hybride : pré-remplis
// mais librement modifiables ensuite, page libre possible). Les sections sont
// construites avec les blocs de lib/sections.ts — aucune logique de rendu
// spécifique aux templates.
//
// Ce module ne contient que la structure INVARIANTE (quels blocs, dans quel
// ordre). Le texte (label, description, titre, chemin, paragraphes, FAQ) vit
// dans le dictionnaire i18n "pageTemplates" — voir lib/page-templates-i18n.ts
// pour l'API localisée.

import {
  createBlockSection,
  type BlockSection,
  type PageSection,
} from "@/lib/sections";
import type { Locale } from "@/lib/i18n/config";

export type PageTemplateId =
  | "a-propos"
  | "tarifs"
  | "contact"
  | "galerie"
  | "faq"
  | "libre";

export const PAGE_TEMPLATE_IDS: PageTemplateId[] = [
  "a-propos",
  "tarifs",
  "contact",
  "galerie",
  "faq",
  "libre",
];

// Chemin initial suggéré, par langue. Volontairement tenu à l'écart du
// dictionnaire i18n : lib/slug.ts#slugify() ne conserve que [a-z0-9-] (aucune
// translittération du cyrillique/CJK/arabe), donc un chemin traduit dans ces
// scripts se viderait après passage dans slugify() côté createSitePage(). Le
// chemin reste de toute façon librement modifiable par l'utilisateur juste
// après la création.
const DEFAULT_PATHS: Record<PageTemplateId, Record<Locale, string>> = {
  "a-propos": { fr: "a-propos", en: "about", es: "sobre-nosotros", de: "ueber-uns", it: "chi-siamo", ru: "o-nas", zh: "guanyu", ja: "about", ar: "about" },
  tarifs: { fr: "tarifs", en: "pricing", es: "tarifas", de: "preise", it: "tariffe", ru: "tseny", zh: "jiage", ja: "pricing", ar: "pricing" },
  contact: { fr: "contact", en: "contact", es: "contacto", de: "kontakt", it: "contatti", ru: "kontakty", zh: "lianxi", ja: "contact", ar: "contact" },
  galerie: { fr: "galerie", en: "gallery", es: "galeria", de: "galerie", it: "galleria", ru: "galereya", zh: "xiangce", ja: "gallery", ar: "gallery" },
  faq: { fr: "faq", en: "faq", es: "preguntas-frecuentes", de: "faq", it: "faq", ru: "faq", zh: "faq", ja: "faq", ar: "faq" },
  libre: { fr: "nouvelle-page", en: "new-page", es: "nueva-pagina", de: "neue-seite", it: "nuova-pagina", ru: "novaya-stranitsa", zh: "new-page", ja: "new-page", ar: "new-page" },
};

export function defaultTemplatePath(id: PageTemplateId, locale: Locale): string {
  return DEFAULT_PATHS[id]?.[locale] ?? DEFAULT_PATHS[id]?.fr ?? id;
}

// Petit helper : bloc pré-rempli (createBlockSection pose les défauts vides).
function block<T extends BlockSection["type"]>(
  type: T,
  settings: Partial<Extract<BlockSection, { type: T }>["settings"]>
): BlockSection {
  const section = createBlockSection(type);
  return {
    ...section,
    settings: { ...section.settings, ...settings },
  } as BlockSection;
}

export type PageTemplateText = {
  aProposHistoryTitle: string;
  aProposHistoryBody: string;
  aProposMethodTitle: string;
  aProposMethodBody: string;
  tarifsTitle: string;
  tarifsBody: string;
  tarifsFaqTitle: string;
  tarifsFaqQuestion: string;
  contactTitle: string;
  contactBody: string;
  faqTitle: string;
};

// Construit les sections d'un template à partir de son texte localisé. La
// structure (quels blocs, quel ordre) reste identique quelle que soit la
// locale — seul le contenu injecté change.
const SECTION_BUILDERS: Record<PageTemplateId, (t: PageTemplateText) => PageSection[]> = {
  "a-propos": (t) => [
    block("a_propos", { title: t.aProposHistoryTitle, body: t.aProposHistoryBody }),
    block("image_texte", {
      title: t.aProposMethodTitle,
      body: t.aProposMethodBody,
      imageSide: "right",
    }),
  ],
  tarifs: (t) => [
    block("texte", { title: t.tarifsTitle, body: t.tarifsBody }),
    { id: "prestations", type: "prestations", enabled: true },
    { id: "boutique", type: "boutique", enabled: true },
    block("faq", {
      title: t.tarifsFaqTitle,
      items: [{ question: t.tarifsFaqQuestion, answer: "" }],
    }),
  ],
  contact: (t) => [
    block("texte", { title: t.contactTitle, body: t.contactBody }),
    block("carte", {}),
    { id: "horaires", type: "horaires", enabled: true },
  ],
  galerie: () => [
    { id: "galerie", type: "galerie", enabled: true },
    block("avant_apres", {}),
  ],
  faq: (t) => [
    block("faq", { title: t.faqTitle, items: [{ question: "", answer: "" }] }),
  ],
  libre: () => [],
};

export function buildTemplateSections(id: PageTemplateId, text: PageTemplateText): PageSection[] {
  return (SECTION_BUILDERS[id] ?? SECTION_BUILDERS.libre)(text);
}
