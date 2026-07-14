"use server";

// Server actions des sous-pages (table site_pages, migration 00021).
// Même philosophie que actions.ts : l'éditeur écrit dans le brouillon
// (site_pages.draft via merge_site_page_draft), la publication reste l'acte
// unique à 5 crédits de publish_page qui couvre tout le site.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { subpageLimit } from "@/lib/plans";
import { validateSections } from "@/lib/sections";
import { getPageTemplate } from "@/lib/page-templates";
import { slugify } from "@/lib/slug";
import type { Plan, SitePage, SitePageDraftFields } from "@/lib/types";

const MAX_PATH_LENGTH = 48;
const MAX_TITLE_LENGTH = 80;

function normalizePath(input: string): string {
  return slugify(input).slice(0, MAX_PATH_LENGTH);
}

// Vérifie que le projet appartient bien à l'utilisateur connecté.
async function ownedPage(pageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, page: null };
  const { data: page } = await supabase
    .from("pages")
    .select("id, slug")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  return { supabase, user, page };
}

// Crée une sous-page depuis un modèle (ou libre). Elle naît en brouillon
// (draft_status = 'new') : invisible en public tant que non publiée.
export async function createSitePage(
  pageId: string,
  input: { templateId: string; title?: string; path?: string }
): Promise<{ error?: string; sitePage?: SitePage }> {
  const { supabase, user, page } = await ownedPage(pageId);
  if (!user || !page) return { error: "Page introuvable." };

  const [{ data: profile }, { data: existing }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase
      .from("site_pages")
      .select("id, path, position, draft")
      .eq("page_id", pageId),
  ]);
  const rows = existing ?? [];
  if (rows.length >= subpageLimit((profile?.plan as Plan) ?? "basique")) {
    return { error: "Limite de pages atteinte pour ton forfait." };
  }

  const template = getPageTemplate(input.templateId);
  const title = (input.title?.trim() || template.defaultTitle).slice(0, MAX_TITLE_LENGTH);
  let path = normalizePath(input.path?.trim() || input.title?.trim() || template.defaultPath);
  if (!path) path = template.defaultPath;

  // Unicité du path dans le projet (y compris les paths en brouillon) :
  // suffixe numérique si déjà pris.
  const taken = new Set(
    rows.flatMap((r) => [r.path, (r.draft as { path?: string } | null)?.path]).filter(Boolean)
  );
  if (taken.has(path)) {
    for (let attempt = 2; attempt < 20; attempt++) {
      const candidate = `${path}-${attempt}`.slice(0, MAX_PATH_LENGTH);
      if (!taken.has(candidate)) {
        path = candidate;
        break;
      }
    }
  }

  const { data: sitePage, error } = await supabase
    .from("site_pages")
    .insert({
      page_id: pageId,
      path,
      title,
      sections: template.sections(),
      position: rows.length,
      draft_status: "new",
    })
    .select("*")
    .single<SitePage>();
  if (error || !sitePage) return { error: "Impossible de créer la page." };

  revalidatePath("/ma-page");
  return { sitePage };
}

// Autosave des champs d'une sous-page — dans le BROUILLON (site_pages.draft).
// Gratuite, comme savePageFields. Le path n'est modifiable que tant que la
// page n'a jamais été publiée (draft_status = 'new') : on ne casse pas les
// URLs indexées.
export async function saveSitePageFields(
  sitePageId: string,
  fields: Partial<SitePageDraftFields>
): Promise<{ error?: string }> {
  if (fields.sections) {
    const sectionsError = validateSections(fields.sections);
    if (sectionsError) return { error: sectionsError };
  }
  if (fields.title !== undefined) {
    fields.title = fields.title.slice(0, MAX_TITLE_LENGTH);
  }
  if (fields.subtitle !== undefined) {
    fields.subtitle = fields.subtitle.slice(0, 200);
  }

  const supabase = await createClient();

  if (fields.path !== undefined) {
    const { data: row } = await supabase
      .from("site_pages")
      .select("page_id, draft_status")
      .eq("id", sitePageId)
      .single();
    if (!row) return { error: "Page introuvable." };
    if (row.draft_status !== "new") {
      return { error: "L'adresse d'une page publiée ne peut plus changer." };
    }
    const path = normalizePath(fields.path);
    if (!path) return { error: "Adresse de page invalide." };
    const { data: conflict } = await supabase
      .from("site_pages")
      .select("id")
      .eq("page_id", row.page_id)
      .eq("path", path)
      .neq("id", sitePageId)
      .maybeSingle();
    if (conflict) return { error: "Cette adresse est déjà utilisée." };
    fields.path = path;
  }

  const { error } = await supabase.rpc("merge_site_page_draft", {
    spid: sitePageId,
    fields,
  });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/ma-page");
  return {};
}

// Supprime une sous-page. Jamais publiée → suppression immédiate ; sinon
// suppression différée (draft_status = 'deleted'), appliquée à la publication.
export async function deleteSitePage(
  sitePageId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("site_pages")
    .select("id, draft_status")
    .eq("id", sitePageId)
    .single();
  if (!row) return { error: "Page introuvable." };

  const { error } =
    row.draft_status === "new"
      ? await supabase.from("site_pages").delete().eq("id", sitePageId)
      : await supabase
          .from("site_pages")
          .update({ draft_status: "deleted" })
          .eq("id", sitePageId);
  if (error) return { error: "Suppression impossible." };
  revalidatePath("/ma-page");
  return {};
}

// Annule la suppression différée d'une sous-page publiée.
export async function restoreSitePage(
  sitePageId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_pages")
    .update({ draft_status: null })
    .eq("id", sitePageId)
    .eq("draft_status", "deleted");
  if (error) return { error: "Restauration impossible." };
  revalidatePath("/ma-page");
  return {};
}

// Réordonne les sous-pages (ordre du menu et de la barre d'onglets).
export async function reorderSitePages(
  pageId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const { user, page, supabase } = await ownedPage(pageId);
  if (!user || !page) return { error: "Page introuvable." };
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("site_pages")
      .update({ position: i })
      .eq("id", orderedIds[i])
      .eq("page_id", pageId);
  }
  revalidatePath("/ma-page");
  return {};
}
