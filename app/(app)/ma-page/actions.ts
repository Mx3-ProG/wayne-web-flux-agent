"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, hasLocale } from "@/lib/i18n/config";
import { getVertical } from "@/lib/verticals";
import { getLocalizedVertical } from "@/lib/verticals-i18n";
import { defaultLegal } from "@/lib/legal";
import { projectLimit, PUBLISH_COST, VITRINE_ASSIST_COST } from "@/lib/plans";
import { spendCredits, refundCredits } from "@/lib/credits";
import { loadAccountAccess } from "@/lib/account-status";
import { validateSections } from "@/lib/sections";
import { slugify } from "@/lib/slug";
import type { PageDraftFields, Plan } from "@/lib/types";
import { enforceKarlMada, KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada";
import { appearanceConfigError, designConfigError } from "@/lib/vitrine-design/resolver";

// Crée la vitrine initiale : slug unique, prestations pré-remplies selon le
// métier, horaires par défaut (mar-sam 9h-19h), textes légaux générés.
export async function createPage(input: {
  vertical: string;
  businessName: string;
  jobTitle: string;
  city: string;
}): Promise<{ error?: string; slug?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const moderation = await enforceKarlMada(input, {
    userId: user.id,
    surface: "page:create",
  });
  if (moderation.error) return moderation;

  const businessName = input.businessName.trim().slice(0, 60);
  if (!businessName) return { error: "business_name_required" };

  // Limite de projets selon le forfait (gratuit = 1, Plus = 3).
  const [{ data: profile }, { count: pageCount }] = await Promise.all([
    supabase.from("profiles").select("plan, locale").eq("user_id", user.id).single(),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  if ((pageCount ?? 0) >= projectLimit((profile?.plan as Plan) ?? "basique")) {
    return { error: "project_limit_reached" };
  }

  const vertical = getVertical(input.vertical);
  const profileLocale = profile?.locale;
  const locale = profileLocale && hasLocale(profileLocale) ? profileLocale : defaultLocale;
  // Métier traduit dans la langue de la page : sert au préremplissage des
  // prestations/produits ci-dessous, quelle que soit la locale (plus de
  // condition locale === "fr").
  const localizedVertical = await getLocalizedVertical(input.vertical, locale);
  let slug = slugify(businessName);
  if (slug.length < 3) slug = `page-${slug}`.slice(0, 32);

  // Unicité du slug : suffixe numérique si déjà pris.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data: existing } = await supabase
      .from("pages")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!existing) {
      slug = candidate;
      break;
    }
  }

  const { data: page, error } = await supabase
    .from("pages")
    .insert({
      user_id: user.id,
      slug,
      default_locale: locale,
      enabled_locales: [locale],
      vertical: vertical.slug,
      business_name: businessName,
      job_title: input.jobTitle.trim().slice(0, 60),
      city: input.city.trim().slice(0, 60),
      font: "fraunces",
      colors: vertical.defaultColors,
      // defaultLegal(locale) : gabarit juridique FRANÇAIS (SIRET, TVA en
      // droit français…) uniquement en fr ; les autres locales reçoivent un
      // gabarit générique natif dans leur langue, avec un avertissement
      // explicite invitant à une validation juridique locale avant
      // publication (lib/legal.ts) — jamais du droit français traduit tel
      // quel.
      legal: defaultLegal(businessName, locale),
    })
    .select("id, slug")
    .single();
  if (error || !page) return { error: "creation_failed" };

  // Prestations pré-remplies du métier, dans la langue de la page.
  for (let fi = 0; fi < localizedVertical.families.length; fi++) {
    const fam = localizedVertical.families[fi];
    const { data: family } = await supabase
      .from("service_families")
      .insert({ page_id: page.id, name: fam.name, position: fi })
      .select("id")
      .single();
    if (family) {
      await supabase.from("services").insert(
        fam.services.map((s, si) => ({
          family_id: family.id,
          page_id: page.id,
          name: s.name,
          duration_min: s.duration_min,
          price_cents: s.price_cents,
          position: si,
        }))
      );
    }
  }

  // Boutique pré-remplie du métier (verticals product/hybrid uniquement),
  // dans la langue de la page.
  const productCategories = localizedVertical.productCategories ?? [];
  for (let ci = 0; ci < productCategories.length; ci++) {
    const cat = productCategories[ci];
    const { data: category } = await supabase
      .from("product_categories")
      .insert({ page_id: page.id, name: cat.name, position: ci })
      .select("id")
      .single();
    if (category) {
      await supabase.from("products").insert(
        cat.products.map((p, pi) => ({
          category_id: category.id,
          page_id: page.id,
          name: p.name,
          price_cents: p.price_cents,
          position: pi,
        }))
      );
    }
  }

  // Horaires par défaut : mardi → samedi, 9h-19h. Modifiables dans l'agenda.
  await supabase.from("schedules").insert(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      page_id: page.id,
      weekday,
      open: weekday >= 2 && weekday <= 6,
      ranges: weekday >= 2 && weekday <= 6 ? [["09:00", "19:00"]] : [],
    }))
  );

  // Active le nouveau projet. On ne touche PAS à onboarding_step : c'est le
  // curseur d'écran du tunnel /commencer, qui appelle cette action au milieu du
  // Parcours — l'écraser ferait sauter l'utilisateur en avant.
  await supabase
    .from("profiles")
    .update({ active_page_id: page.id })
    .eq("user_id", user.id);

  revalidatePath("/ma-page");
  revalidatePath("/projets");
  revalidatePath(`/p/${page.slug}`);
  return { slug: page.slug };
}

// Autosave des champs simples de la vitrine — dans le BROUILLON (pages.draft).
// Le site public ne bouge pas tant que la version n'est pas publiée (5 cr.).
// Merge jsonb côté SQL (merge_page_draft) pour éviter les races de l'autosave.
// Gratuite : c'est le chemin de l'éditeur complet. L'assistant FLUX passe par
// saveVitrineGuide (payante) ci-dessous.
export async function savePageFields(
  pageId: string,
  fields: Partial<PageDraftFields>
): Promise<{ error?: string }> {
  const moderation = await enforceKarlMada(fields, {
    pageId,
    surface: "page-draft:save",
  });
  if (moderation.error) return moderation;
  // Le contenu des blocs vit dans le draft jsonb : on borne sa taille.
  if (fields.sections) {
    const sectionsError = validateSections(fields.sections);
    if (sectionsError) return { error: sectionsError };
  }
  if (fields.navigation) {
    const nav = fields.navigation;
    if (nav.items.length > 8) {
      return { error: "too_many_nav_links" };
    }
    if (nav.items.some((item) => item.label.length > 40 || item.target.length > 300)) {
      return { error: "nav_link_too_long" };
    }
  }
  if (fields.design) {
    const designError = designConfigError(fields.design);
    if (designError) return { error: designError };
  }
  if (fields.appearance) {
    const appearanceError = appearanceConfigError(fields.appearance);
    if (appearanceError) return { error: appearanceError };
  }
  const supabase = await createClient();
  if (fields.hide_branding === true) {
    const { data: allowed, error: entitlementError } = await supabase.rpc(
      "can_hide_branding"
    );
    if (entitlementError || allowed !== true) {
      return { error: "branding_requires_enterprise" };
    }
  }
  const { error } = await supabase.rpc("merge_page_draft", {
    pid: pageId,
    fields,
  });
  if (error) return { error: "save_failed" };
  revalidatePath("/ma-page");
  return {};
}

// Réglage fonctionnel immédiat : il ne modifie aucun contenu de la vitrine et
// n'attend donc pas la prochaine publication payante.
export async function setStorefrontAssistantEnabled(
  pageId: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };
  const { data: page, error } = await supabase
    .from("pages")
    .update({ assistant_enabled: enabled })
    .eq("id", pageId)
    .eq("user_id", user.id)
    .select("slug")
    .single<{ slug: string }>();
  if (error || !page) return { error: "Réglage impossible." };
  revalidatePath("/ma-page");
  revalidatePath(`/p/${page.slug}`);
  return {};
}

// Confirmation finale de l'assistant vitrine FLUX : le passage guidé coûte
// VITRINE_ASSIST_COST crédits (l'éditeur complet, lui, reste gratuit).
// Débit avant la sauvegarde, refund si elle échoue.
export async function saveVitrineGuide(
  pageId: string,
  fields: Partial<PageDraftFields>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  if (!page) return { error: "page_not_found" };

  const { error: spendError } = await spendCredits(
    user.id,
    VITRINE_ASSIST_COST,
    "vitrine:guide"
  );
  if (spendError) return { error: spendError };

  const result = await savePageFields(pageId, fields);
  if (result.error) {
    if (result.error !== KARLMADA_BLOCK_MESSAGE) {
      await refundCredits(user.id, VITRINE_ASSIST_COST, "refund:vitrine");
    }
    return result;
  }
  return {};
}

export type PublishError =
  | "insufficient_credits"
  | "nothing_to_publish"
  | "subscription_required"
  | "email_not_verified"
  | "path_taken"
  | "content_blocked"
  | "account_suspended"
  | "unknown";

// Publie une nouvelle version du site : débit atomique de 5 crédits + merge
// des brouillons (vitrine + offres) + snapshot dans page_versions, le tout
// dans la fonction SQL publish_page.
export async function publishPage(
  pageId: string
): Promise<{ error?: PublishError; balance?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unknown" };

  const { data: page } = await supabase
    .from("pages")
    .select("slug")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  if (!page) return { error: "unknown" };

  // Compte suspendu par la modération : publication coupée jusqu'à réactivation.
  const access = await loadAccountAccess(user.id);
  if (access.status === "suspended") return { error: "account_suspended" };

  // Dernier verrou : on rescane l'intégralité du contenu publiable, y compris
  // les anciens brouillons créés avant KarlMada.
  const [{ data: fullPage }, { data: products }, { data: offers }, { data: services }, { data: sitePages }] =
    await Promise.all([
      supabase.from("pages").select("business_name, job_title, tagline, city, draft, legal, sections, seo, promo, reviews").eq("id", pageId).single(),
      supabase.from("products").select("name, description").eq("page_id", pageId),
      supabase.from("offers").select("title, description, draft, draft_status").eq("page_id", pageId),
      supabase.from("services").select("name").eq("page_id", pageId),
      supabase.from("site_pages").select("title, subtitle, draft, sections, seo, draft_status").eq("page_id", pageId),
    ]);
  const moderation = await enforceKarlMada(
    { page: fullPage, products, offers, services, sitePages },
    { userId: user.id, pageId, surface: "page:publish" }
  );
  if (moderation.error) {
    // La tentative de publication interdite est facturée, sans appliquer le
    // brouillon. Une absence de solde n'annule pas l'infraction KarlMada.
    await spendCredits(user.id, PUBLISH_COST, "karlmada:publish-blocked");
    return { error: "content_blocked" };
  }

  const { data: balance, error } = await supabase.rpc("publish_page", {
    pid: pageId,
  });
  if (error) {
    if (error.message.includes("insufficient_credits")) {
      return { error: "insufficient_credits" };
    }
    if (error.message.includes("nothing_to_publish")) {
      return { error: "nothing_to_publish" };
    }
    if (error.message.includes("subscription_required")) {
      return { error: "subscription_required" };
    }
    if (error.message.includes("email_not_verified")) {
      return { error: "email_not_verified" };
    }
    if (error.message.includes("path_taken")) {
      return { error: "path_taken" };
    }
    return { error: "unknown" };
  }

  revalidatePath("/ma-page");
  revalidatePath("/offres");
  // "layout" : invalide la home ET toutes les sous-pages /p/slug/*.
  revalidatePath(`/p/${page.slug}`, "layout");
  return { balance: balance ?? undefined };
}

export type CatalogFamily = {
  name: string;
  services: { name: string; duration_min: number; price_cents: number }[];
};

// Remplace tout le catalogue prestations (v1 simple et fiable : delete + insert).
// Les réservations gardent leur propre copie du nom/durée/prix.
export async function syncCatalog(
  pageId: string,
  families: CatalogFamily[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const moderation = await enforceKarlMada(families, {
    userId: user.id,
    pageId,
    surface: "catalog:services-sync",
  });
  if (moderation.error) return moderation;

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  if (!page) return { error: "page_not_found" };

  await supabase.from("service_families").delete().eq("page_id", pageId);

  for (let fi = 0; fi < families.length; fi++) {
    const fam = families[fi];
    const name = fam.name.trim().slice(0, 60);
    if (!name) continue;
    const { data: family } = await supabase
      .from("service_families")
      .insert({ page_id: pageId, name, position: fi })
      .select("id")
      .single();
    if (family && fam.services.length > 0) {
      await supabase.from("services").insert(
        fam.services
          .filter((s) => s.name.trim())
          .map((s, si) => ({
            family_id: family.id,
            page_id: pageId,
            name: s.name.trim().slice(0, 80),
            duration_min: Math.min(600, Math.max(5, s.duration_min || 60)),
            price_cents: Math.max(0, Math.round(s.price_cents || 0)),
            position: si,
          }))
      );
    }
  }

  revalidatePath("/ma-page");
  return {};
}

export type CatalogProduct = {
  id: string | null; // null = nouveau produit
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
};
export type CatalogProductCategory = {
  id: string | null; // null = nouvelle catégorie
  name: string;
  products: CatalogProduct[];
};

// Synchronise la boutique par diff (update/insert/delete) pour garder des IDs
// produits STABLES — indispensable au stock et à son historique (Phase 2).
// Ne touche jamais aux colonnes stock/track_stock (gérées via /stock).
export async function syncProducts(
  pageId: string,
  categories: CatalogProductCategory[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const moderation = await enforceKarlMada(categories, {
    userId: user.id,
    pageId,
    surface: "catalog:products-sync",
  });
  if (moderation.error) return moderation;

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  if (!page) return { error: "page_not_found" };

  const [{ data: existingCats }, { data: existingProds }] = await Promise.all([
    supabase.from("product_categories").select("id").eq("page_id", pageId),
    supabase.from("products").select("id").eq("page_id", pageId),
  ]);
  const existingCatIds = new Set((existingCats ?? []).map((c) => c.id));
  const existingProdIds = new Set((existingProds ?? []).map((p) => p.id));
  const keepCatIds = new Set<string>();
  const keepProdIds = new Set<string>();

  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    const name = cat.name.trim().slice(0, 60);
    if (!name) continue;

    let catId = cat.id;
    if (catId && existingCatIds.has(catId)) {
      await supabase
        .from("product_categories")
        .update({ name, position: ci })
        .eq("id", catId);
    } else {
      const { data: inserted } = await supabase
        .from("product_categories")
        .insert({ page_id: pageId, name, position: ci })
        .select("id")
        .single();
      catId = inserted?.id ?? null;
    }
    if (!catId) continue;
    keepCatIds.add(catId);

    for (let pi = 0; pi < cat.products.length; pi++) {
      const p = cat.products[pi];
      if (!p.name.trim()) continue;
      const fields = {
        category_id: catId,
        name: p.name.trim().slice(0, 80),
        description: p.description.trim().slice(0, 400),
        price_cents: Math.max(0, Math.round(p.price_cents || 0)),
        image_url: p.image_url,
        position: pi,
      };
      if (p.id && existingProdIds.has(p.id)) {
        await supabase.from("products").update(fields).eq("id", p.id);
        keepProdIds.add(p.id);
      } else {
        const { data: inserted } = await supabase
          .from("products")
          .insert({ page_id: pageId, ...fields })
          .select("id")
          .single();
        if (inserted?.id) keepProdIds.add(inserted.id);
      }
    }
  }

  // Suppression de ce qui n'est plus présent (cascade → mouvements de stock).
  const prodToDelete = [...existingProdIds].filter((id) => !keepProdIds.has(id));
  if (prodToDelete.length > 0) {
    await supabase.from("products").delete().in("id", prodToDelete);
  }
  const catToDelete = [...existingCatIds].filter((id) => !keepCatIds.has(id));
  if (catToDelete.length > 0) {
    await supabase.from("product_categories").delete().in("id", catToDelete);
  }

  revalidatePath("/ma-page");
  return {};
}
