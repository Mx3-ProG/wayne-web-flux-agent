import "server-only";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import {
  PAGE_TEMPLATE_IDS,
  buildTemplateSections,
  defaultTemplatePath,
  type PageTemplateId,
  type PageTemplateText,
} from "@/lib/page-templates";
import type { PageSection } from "@/lib/sections";

export type LocalizedPageTemplate = {
  id: PageTemplateId;
  label: string;
  description: string;
  defaultPath: string;
  defaultTitle: string;
  sections: () => PageSection[];
};

// Vue sérialisable (sans le closure `sections`) sûre à passer à un Client
// Component. React ne peut pas franchir la frontière serveur→client avec une
// fonction : on ne transmet donc que les métadonnées. Le constructeur de
// sections reste appelé côté serveur (voir subpage-actions.ts).
export type PageTemplateMeta = Omit<LocalizedPageTemplate, "sections">;

export function toPageTemplateMeta(template: LocalizedPageTemplate): PageTemplateMeta {
  const { sections: _sections, ...meta } = template;
  return meta;
}

function fail(message: string): never {
  throw new Error(`[page-templates-i18n] ${message}`);
}

export async function getPageTemplates(locale: Locale): Promise<LocalizedPageTemplate[]> {
  const dict = await getDictionary(locale, "pageTemplates");
  return PAGE_TEMPLATE_IDS.map((id) => {
    const entry = dict[id];
    if (!entry) fail(`missing pageTemplates.json entry for id "${id}"`);
    // Chaque entrée ne porte que les champs utiles à SON constructeur de
    // sections (ex. "tarifs" n'a pas de aProposHistoryTitle) ; le cast est
    // sûr car buildTemplateSections(id, …) ne lit jamais un champ hors de
    // ceux propres au template "id".
    const text = entry as unknown as PageTemplateText;
    return {
      id,
      label: entry.label,
      description: entry.description,
      defaultPath: defaultTemplatePath(id, locale),
      defaultTitle: entry.defaultTitle,
      sections: () => buildTemplateSections(id, text),
    };
  });
}

export async function getPageTemplate(id: string, locale: Locale): Promise<LocalizedPageTemplate> {
  const templates = await getPageTemplates(locale);
  const templateId = (PAGE_TEMPLATE_IDS as string[]).includes(id) ? (id as PageTemplateId) : "libre";
  return templates.find((t) => t.id === templateId) ?? templates[templates.length - 1];
}
