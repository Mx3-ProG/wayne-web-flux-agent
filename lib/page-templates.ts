// Modèles de sous-pages proposés à la création (modèle hybride : pré-remplis
// mais librement modifiables ensuite, page libre possible). Les sections sont
// construites avec les blocs de lib/sections.ts — aucune logique de rendu
// spécifique aux templates.

import {
  createBlockSection,
  type BlockSection,
  type PageSection,
} from "@/lib/sections";

export type PageTemplateId =
  | "a-propos"
  | "tarifs"
  | "contact"
  | "galerie"
  | "faq"
  | "libre";

export type PageTemplate = {
  id: PageTemplateId;
  label: string;
  description: string;
  defaultPath: string;
  defaultTitle: string;
  sections: () => PageSection[];
};

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

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "a-propos",
    label: "À propos",
    description: "Ton histoire, ton parcours, une photo.",
    defaultPath: "a-propos",
    defaultTitle: "À propos",
    sections: () => [
      block("a_propos", {
        title: "Mon histoire",
        body: "Raconte ici ton parcours, ta passion et ce qui rend ton travail unique.",
      }),
      block("image_texte", {
        title: "Ma façon de travailler",
        body: "Décris ta méthode, tes valeurs, ce que tes clients peuvent attendre.",
        imageSide: "right",
      }),
    ],
  },
  {
    id: "tarifs",
    label: "Tarifs",
    description: "Tes prix, présentés clairement.",
    defaultPath: "tarifs",
    defaultTitle: "Tarifs",
    sections: () => [
      block("texte", {
        title: "Mes tarifs",
        body: "Présente ici tes prix et ce qu'ils incluent.",
      }),
      { id: "prestations", type: "prestations", enabled: true },
      { id: "boutique", type: "boutique", enabled: true },
      block("faq", {
        title: "Questions fréquentes",
        items: [
          { question: "Quels moyens de paiement acceptez-vous ?", answer: "" },
        ],
      }),
    ],
  },
  {
    id: "contact",
    label: "Contact",
    description: "Carte, horaires et coordonnées.",
    defaultPath: "contact",
    defaultTitle: "Contact",
    sections: () => [
      block("texte", {
        title: "Me contacter",
        body: "Indique ici la meilleure façon de te joindre.",
      }),
      block("carte", {}),
      { id: "horaires", type: "horaires", enabled: true },
    ],
  },
  {
    id: "galerie",
    label: "Galerie",
    description: "Tes réalisations en photos.",
    defaultPath: "galerie",
    defaultTitle: "Galerie",
    sections: () => [
      { id: "galerie", type: "galerie", enabled: true },
      block("avant_apres", {}),
    ],
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Les réponses aux questions courantes.",
    defaultPath: "faq",
    defaultTitle: "Questions fréquentes",
    sections: () => [
      block("faq", {
        title: "Questions fréquentes",
        items: [{ question: "", answer: "" }],
      }),
    ],
  },
  {
    id: "libre",
    label: "Page libre",
    description: "Une page vide, à composer toi-même.",
    defaultPath: "nouvelle-page",
    defaultTitle: "Nouvelle page",
    sections: () => [],
  },
];

export function getPageTemplate(id: string): PageTemplate {
  return PAGE_TEMPLATES.find((t) => t.id === id) ?? PAGE_TEMPLATES[PAGE_TEMPLATES.length - 1];
}
