import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Entités traduisibles d'une boutique, mappées sur les entity_type déjà
// acceptés par localized_content (migration 00034) : 'page' et 'site_page'
// portent chacun plusieurs des "entités" listées dans le brief (navigation,
// SEO, sections, FAQ, textes légaux, avis éditoriaux) comme sous-champs JSON
// d'une même ligne — elles n'ont pas besoin d'entity_type séparés, seulement
// d'être incluses dans le payload `fields` traduit ensemble pour cette page.
//
// Volontairement INVARIANTS et donc absents des payloads ci-dessous : prix,
// devise, stocks, horaires, médias, coordonnées, couleurs, styles,
// identifiants, statuts, positions — conformément au brief.
export type EntityType =
  | "page"
  | "site_page"
  | "service_family"
  | "service"
  | "product_category"
  | "product"
  | "offer";

export type EntitySource = {
  entity_type: EntityType;
  entity_id: string;
  fields: Record<string, unknown>;
};

export function sourceHash(fields: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex").slice(0, 32);
}

// Chemin de sous-page volontairement exclu du payload traduit : c'est un
// identifiant d'URL, pas de la prose (même raison que
// lib/page-templates.ts#DEFAULT_PATHS — slugify() viderait un chemin
// traduit en cyrillique/CJK/arabe). Le préfixe de locale dans l'URL (Lot 8)
// suffit à distinguer les langues même à chemin technique identique.
export async function collectPageEntities(
  supabase: SupabaseClient,
  pageId: string
): Promise<EntitySource[]> {
  const [
    { data: page },
    { data: sitePages },
    { data: families },
    { data: services },
    { data: categories },
    { data: products },
    { data: offers },
  ] = await Promise.all([
    supabase
      .from("pages")
      .select("id, tagline, seo, navigation, sections, legal, reviews")
      .eq("id", pageId)
      .single(),
    supabase
      .from("site_pages")
      .select("id, title, subtitle, seo, sections")
      .eq("page_id", pageId),
    supabase.from("service_families").select("id, name").eq("page_id", pageId),
    supabase.from("services").select("id, name").eq("page_id", pageId),
    supabase.from("product_categories").select("id, name").eq("page_id", pageId),
    supabase.from("products").select("id, name, description").eq("page_id", pageId),
    supabase.from("offers").select("id, title, description").eq("page_id", pageId),
  ]);

  const entities: EntitySource[] = [];

  if (page) {
    entities.push({
      entity_type: "page",
      entity_id: page.id,
      fields: {
        tagline: page.tagline ?? "",
        seo: page.seo ?? {},
        navigation: page.navigation ?? null,
        sections: page.sections ?? null,
        legal: page.legal ?? {},
        reviews: page.reviews ?? [],
      },
    });
  }

  for (const sp of sitePages ?? []) {
    entities.push({
      entity_type: "site_page",
      entity_id: sp.id,
      fields: {
        title: sp.title ?? "",
        subtitle: sp.subtitle ?? "",
        seo: sp.seo ?? {},
        sections: sp.sections ?? null,
      },
    });
  }
  for (const f of families ?? []) {
    entities.push({ entity_type: "service_family", entity_id: f.id, fields: { name: f.name ?? "" } });
  }
  for (const s of services ?? []) {
    entities.push({ entity_type: "service", entity_id: s.id, fields: { name: s.name ?? "" } });
  }
  for (const c of categories ?? []) {
    entities.push({ entity_type: "product_category", entity_id: c.id, fields: { name: c.name ?? "" } });
  }
  for (const p of products ?? []) {
    entities.push({
      entity_type: "product",
      entity_id: p.id,
      fields: { name: p.name ?? "", description: p.description ?? "" },
    });
  }
  for (const o of offers ?? []) {
    entities.push({
      entity_type: "offer",
      entity_id: o.id,
      fields: { title: o.title ?? "", description: o.description ?? "" },
    });
  }

  return entities;
}
