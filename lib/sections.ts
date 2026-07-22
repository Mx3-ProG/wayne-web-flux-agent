// Système de sections de la vitrine (pages.sections).
//
// Deux familles :
//  - sections « natives » : leurs données viennent des tables (offres, produits,
//    services, galerie…). Uniques, non supprimables — seulement réordonnables
//    et activables. Leur id est égal à leur type.
//  - blocs de contenu : ajoutables/duplicables par l'utilisateur, tout leur
//    contenu vit dans `settings`. Leur id est un uuid.
//
// pages.sections = null → DEFAULT_SECTIONS (rendu historique, jamais backfillé).
// Le hero et le footer restent fixes, hors liste.

import type { Page } from "@/lib/types";

export type NativeSectionType =
  | "promo"
  | "offres"
  | "boutique"
  | "prestations"
  | "galerie"
  | "avis"
  | "horaires";

export type BlockSectionType =
  | "texte"
  | "image_texte"
  | "faq"
  | "a_propos"
  | "avant_apres"
  | "carte"
  | "google_business"
  | "newsletter"
  | "video";

export type SectionType = NativeSectionType | BlockSectionType;

export type FaqItem = { question: string; answer: string };

// Apparence d'une section (transverse à tous les types, natives comprises).
// Une section avec un fond devient pleine largeur au rendu (section-shell).
export type SectionBackground =
  | { kind: "color"; color: string }
  | { kind: "gradient"; from: string; to: string; angle?: number }
  | { kind: "image"; url: string; overlay?: number } // overlay 0–0.8
  | { kind: "video"; url: string; posterUrl?: string; overlay?: number };

export type SectionStyle = {
  background?: SectionBackground;
  spacing?: "compact" | "normal" | "large";
  width?: "narrow" | "normal" | "full";
  align?: "left" | "center";
};

// Une section « stylée » sort du groupe .services au rendu.
export function hasSectionStyle(section: PageSection): boolean {
  const style = section.style;
  if (!style) return false;
  return Boolean(
    style.background ||
      (style.spacing && style.spacing !== "normal") ||
      (style.width && style.width !== "normal") ||
      (style.align && style.align !== "left")
  );
}

type SectionBase = { id: string; enabled: boolean; style?: SectionStyle };

export type NativeSection = SectionBase & {
  type: NativeSectionType;
  settings?: { title?: string; subtitle?: string };
};

export type BlockSection =
  | (SectionBase & { type: "texte"; settings: { title: string; body: string } })
  | (SectionBase & {
      type: "image_texte";
      settings: { imageUrl: string | null; title: string; body: string; imageSide: "left" | "right" };
    })
  | (SectionBase & { type: "faq"; settings: { title?: string; items: FaqItem[] } })
  | (SectionBase & {
      type: "a_propos";
      settings: { photoUrl: string | null; title: string; body: string };
    })
  | (SectionBase & {
      type: "avant_apres";
      settings: { beforeUrl: string | null; afterUrl: string | null; caption?: string };
    })
  | (SectionBase & { type: "carte"; settings: { query?: string } })
  | (SectionBase & {
      type: "google_business";
      settings: { url: string; title?: string; description?: string };
    })
  | (SectionBase & { type: "newsletter"; settings: { title?: string; description?: string } })
  | (SectionBase & { type: "video"; settings: { url: string } });

export type PageSection = NativeSection | BlockSection;

// Ordre historique de vitrine-view : bandeau promo, offres, puis le bloc
// catalogue (boutique + prestations sous un même titre), galerie, avis, horaires.
export const DEFAULT_SECTIONS: PageSection[] = [
  { id: "promo", type: "promo", enabled: true },
  { id: "offres", type: "offres", enabled: true },
  { id: "boutique", type: "boutique", enabled: true },
  { id: "prestations", type: "prestations", enabled: true },
  { id: "galerie", type: "galerie", enabled: true },
  { id: "avis", type: "avis", enabled: true },
  { id: "horaires", type: "horaires", enabled: true },
];

export const NATIVE_SECTION_TYPES = DEFAULT_SECTIONS.map(
  (s) => s.type
) as NativeSectionType[];

export function isNativeSection(section: PageSection): section is NativeSection {
  return (NATIVE_SECTION_TYPES as string[]).includes(section.type);
}

// Sections effectives d'une page : liste sauvegardée ou ordre par défaut,
// complétée des natives manquantes (forward-compat si un type natif apparaît
// après que l'utilisateur a déjà personnalisé sa liste).
export function resolveSections(
  page: Pick<Page, "sections">
): PageSection[] {
  const saved = page.sections;
  if (!saved || !Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_SECTIONS;
  }
  const present = new Set(saved.map((s) => s.type));
  const missing = DEFAULT_SECTIONS.filter((s) => !present.has(s.type));
  return [...saved, ...missing];
}

// Métadonnées d'affichage pour l'éditeur (panneau Sections).
export const SECTION_META: Record<
  SectionType,
  { label: string; description: string; addable: boolean }
> = {
  promo: { label: "Bandeau promo", description: "Le bandeau en haut de la page.", addable: false },
  offres: { label: "Mes offres", description: "Les offres mises en avant.", addable: false },
  boutique: { label: "Boutique", description: "Les produits à commander.", addable: false },
  prestations: { label: "Prestations", description: "Les rendez-vous à réserver.", addable: false },
  galerie: { label: "Galerie", description: "Les photos de ton travail.", addable: false },
  avis: { label: "Avis clients", description: "Les avis affichés sur la page.", addable: false },
  horaires: { label: "Horaires", description: "Tes horaires d'ouverture.", addable: false },
  texte: { label: "Texte libre", description: "Un titre et un paragraphe.", addable: true },
  image_texte: { label: "Image + texte", description: "Une image à côté d'un texte.", addable: true },
  faq: { label: "FAQ", description: "Questions / réponses dépliables.", addable: true },
  a_propos: { label: "À propos", description: "Ton histoire, avec une photo.", addable: true },
  avant_apres: { label: "Avant / après", description: "Deux photos comparées au curseur.", addable: true },
  carte: { label: "Google Maps affiché", description: "La carte reliée à l'adresse de ton commerce.", addable: true },
  google_business: { label: "Google Business Profile", description: "Ta fiche Google et un accès rapide aux avis.", addable: true },
  newsletter: { label: "Newsletter", description: "Capture les emails de tes visiteurs.", addable: true },
  video: { label: "Vidéo", description: "Une vidéo YouTube, Vimeo ou un fichier.", addable: true },
};

export const ADDABLE_SECTION_TYPES = (
  Object.keys(SECTION_META) as SectionType[]
).filter((t) => SECTION_META[t].addable) as BlockSectionType[];

// Réglages initiaux d'un bloc fraîchement ajouté dans l'éditeur.
export function createBlockSection(type: BlockSectionType): BlockSection {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${type}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  switch (type) {
    case "texte":
      return { id, type, enabled: true, settings: { title: "", body: "" } };
    case "image_texte":
      return {
        id,
        type,
        enabled: true,
        settings: { imageUrl: null, title: "", body: "", imageSide: "left" },
      };
    case "faq":
      return { id, type, enabled: true, settings: { items: [{ question: "", answer: "" }] } };
    case "a_propos":
      return { id, type, enabled: true, settings: { photoUrl: null, title: "", body: "" } };
    case "avant_apres":
      return { id, type, enabled: true, settings: { beforeUrl: null, afterUrl: null } };
    case "carte":
      return { id, type, enabled: true, settings: {} };
    case "google_business":
      return { id, type, enabled: true, settings: { url: "" } };
    case "newsletter":
      return { id, type, enabled: true, settings: {} };
    case "video":
      return { id, type, enabled: true, settings: { url: "" } };
  }
}

// Limites côté serveur (validées dans savePageFields) : le contenu des blocs
// vit dans le draft jsonb, on borne sa taille.
export const SECTION_LIMITS = {
  maxSections: 20,
  maxBodyLength: 2000,
  maxTitleLength: 120,
  maxFaqItems: 10,
} as const;

// Validation serveur d'une liste de sections (savePageFields et
// saveSitePageFields). Retourne un CODE d'erreur stable (traduit à la
// frontière d'affichage via editor.actionErrors — voir
// translate-action-error.ts), ou null si valide.
export function validateSections(sections: PageSection[]): string | null {
  if (sections.length > SECTION_LIMITS.maxSections) {
    return "too_many_sections";
  }
  let videoBackgrounds = 0;
  for (const section of sections) {
    const settings = (section.settings ?? {}) as Record<string, unknown>;
    for (const value of Object.values(settings)) {
      if (typeof value === "string" && value.length > SECTION_LIMITS.maxBodyLength) {
        return "section_text_too_long";
      }
    }
    if (
      section.type === "faq" &&
      section.settings.items.length > SECTION_LIMITS.maxFaqItems
    ) {
      return "too_many_faq_items";
    }
    if (section.type === "google_business" && section.settings.url) {
      try {
        const url = new URL(section.settings.url);
        const googleHosts = [
          "google.com",
          "google.fr",
          "goo.gl",
          "g.page",
        ];
        const isGoogle = googleHosts.some(
          (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
        );
        if (url.protocol !== "https:" || !isGoogle) {
          return "invalid_google_business_link";
        }
      } catch {
        return "invalid_google_business_link";
      }
    }
    const bg = section.style?.background;
    if (bg) {
      const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
      if (bg.kind === "color" && !isHex(bg.color)) return "invalid_section_color";
      if (bg.kind === "gradient" && (!isHex(bg.from) || !isHex(bg.to))) {
        return "invalid_section_color";
      }
      if (bg.kind === "video") videoBackgrounds++;
      if ("overlay" in bg && bg.overlay !== undefined) {
        if (typeof bg.overlay !== "number" || bg.overlay < 0 || bg.overlay > 0.8) {
          return "invalid_background_overlay";
        }
      }
      // Les médias de fond doivent venir du Storage de l'app (bucket public).
      if (
        (bg.kind === "image" || bg.kind === "video") &&
        !isAppStorageUrl(bg.url)
      ) {
        return "invalid_background_media_source";
      }
      if (bg.kind === "video" && bg.posterUrl && !isAppStorageUrl(bg.posterUrl)) {
        return "invalid_poster_media_source";
      }
    }
  }
  if (videoBackgrounds > 1) {
    return "too_many_video_backgrounds";
  }
  return null;
}

function isAppStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return true; // env absente (tests) : on ne bloque pas
  return url.startsWith(`${base}/storage/v1/object/public/page-photos/`);
}
