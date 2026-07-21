import "server-only";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { VerticalsDict } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import {
  VERTICALS,
  getVertical,
  FONTS,
  getFont,
  type Vertical,
  type VerticalKind,
} from "@/lib/verticals";

// Couche localisée au-dessus des données invariantes de lib/verticals.ts.
// Les ids (slug, famille, service, catégorie, produit) sont la source de
// vérité technique ; ce module se contente d'y accrocher le texte de la
// locale demandée. Si un id existe dans lib/verticals.ts sans entrée
// correspondante dans le dictionnaire, on lève une erreur explicite plutôt
// que de retomber silencieusement sur du français ou une chaîne vide — la
// parité de structure entre `fr` et les 8 autres locales est déjà garantie
// à la compilation par le typage de get-dictionary.ts (Namespaces), mais les
// ids de lib/verticals.ts sont maintenus à la main et peuvent diverger.

export type LocalizedService = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
};

export type LocalizedFamily = {
  id: string;
  name: string;
  services: LocalizedService[];
};

export type LocalizedProduct = {
  id: string;
  name: string;
  price_cents: number;
};

export type LocalizedProductCategory = {
  id: string;
  name: string;
  products: LocalizedProduct[];
};

export type LocalizedVertical = {
  slug: string;
  emoji: string;
  kind: VerticalKind;
  defaultColors: Vertical["defaultColors"];
  label: string;
  jobTitles: string[];
  clientWord: string;
  promptContext: string;
  families: LocalizedFamily[];
  productCategories?: LocalizedProductCategory[];
};

export type CatalogWording = {
  categoryWord: string;
  itemWord: string;
  categoryPlaceholder: string;
  itemPlaceholder: string;
  categoryHint: string;
  itemHint: string;
  showStock: boolean;
};

function fail(message: string): never {
  throw new Error(`[verticals-i18n] ${message}`);
}

// Les 10 métiers partagent cette forme dans verticals.json ; "catalogWording"
// et "fontLabels" sont des clés voisines au même niveau, de formes
// différentes — d'où le cast explicite plutôt qu'un simple index sur
// VerticalsDict (qui produirait l'union des 12 formes possibles).
type VerticalEntry = {
  label: string;
  jobTitles: string[];
  clientWord: string;
  promptContext: string;
  families: Record<string, { name: string; services: Record<string, string> }>;
  productCategories?: Record<string, { name: string; products: Record<string, string> }>;
};

function mergeVertical(vertical: Vertical, dict: VerticalsDict): LocalizedVertical {
  const entry = (dict as unknown as Record<string, VerticalEntry>)[vertical.slug];
  if (!entry) fail(`missing verticals.json entry for slug "${vertical.slug}"`);

  const families: LocalizedFamily[] = vertical.families.map((family) => {
    const familyEntry = entry.families[family.id];
    if (!familyEntry) fail(`missing family "${family.id}" for vertical "${vertical.slug}"`);
    return {
      id: family.id,
      name: familyEntry.name,
      services: family.services.map((service) => {
        const name = familyEntry.services[service.id];
        if (!name) fail(`missing service "${service.id}" in family "${family.id}" (${vertical.slug})`);
        return { id: service.id, name, duration_min: service.duration_min, price_cents: service.price_cents };
      }),
    };
  });

  const productCategories: LocalizedProductCategory[] | undefined = vertical.productCategories?.map(
    (category) => {
      const categoryEntry = entry.productCategories?.[category.id];
      if (!categoryEntry) fail(`missing product category "${category.id}" for vertical "${vertical.slug}"`);
      return {
        id: category.id,
        name: categoryEntry.name,
        products: category.products.map((product) => {
          const name = categoryEntry.products[product.id];
          if (!name) fail(`missing product "${product.id}" in category "${category.id}" (${vertical.slug})`);
          return { id: product.id, name, price_cents: product.price_cents };
        }),
      };
    }
  );

  return {
    slug: vertical.slug,
    emoji: vertical.emoji,
    kind: vertical.kind,
    defaultColors: vertical.defaultColors,
    label: entry.label,
    jobTitles: entry.jobTitles,
    clientWord: entry.clientWord,
    promptContext: entry.promptContext,
    families,
    productCategories,
  };
}

export async function getLocalizedVerticals(locale: Locale): Promise<LocalizedVertical[]> {
  const dict = await getDictionary(locale, "verticals");
  return VERTICALS.map((vertical) => mergeVertical(vertical, dict));
}

export async function getLocalizedVertical(slug: string, locale: Locale): Promise<LocalizedVertical> {
  const dict = await getDictionary(locale, "verticals");
  return mergeVertical(getVertical(slug), dict);
}

export async function getCatalogWording(kind: VerticalKind, locale: Locale): Promise<CatalogWording> {
  const dict = await getDictionary(locale, "verticals");
  const wording = dict.catalogWording[kind];
  if (!wording) fail(`missing catalogWording for kind "${kind}"`);
  return { ...wording, showStock: kind !== "service" };
}

export type LocalizedFont = { id: string; label: string; css: string };

export async function getLocalizedFonts(locale: Locale): Promise<LocalizedFont[]> {
  const dict = await getDictionary(locale, "verticals");
  return FONTS.map((font) => {
    const label = (dict.fontLabels as Record<string, string>)[font.id];
    if (!label) fail(`missing font label for "${font.id}"`);
    return { id: font.id, label, css: font.css };
  });
}

export async function getLocalizedFont(id: string, locale: Locale): Promise<LocalizedFont> {
  const dict = await getDictionary(locale, "verticals");
  const font = getFont(id);
  const label = (dict.fontLabels as Record<string, string>)[font.id];
  if (!label) fail(`missing font label for "${font.id}"`);
  return { id: font.id, label, css: font.css };
}
