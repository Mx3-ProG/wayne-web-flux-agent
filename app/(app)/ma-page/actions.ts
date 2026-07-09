"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVertical } from "@/lib/verticals";
import { defaultLegal } from "@/lib/legal";
import { projectLimit } from "@/lib/plans";
import { SECTION_LIMITS } from "@/lib/sections";
import type { PageDraftFields, Plan } from "@/lib/types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
}

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
  if (!user) return { error: "Non connecté." };

  const businessName = input.businessName.trim().slice(0, 60);
  if (!businessName) return { error: "Donne un nom à ta vitrine." };

  // Limite de projets selon le forfait (gratuit = 1, Plus = 3).
  const [{ data: profile }, { count: pageCount }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", user.id).single(),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  if ((pageCount ?? 0) >= projectLimit((profile?.plan as Plan) ?? "basique")) {
    return { error: "Limite de projets atteinte pour ton forfait." };
  }

  const vertical = getVertical(input.vertical);
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
      vertical: vertical.slug,
      business_name: businessName,
      job_title: input.jobTitle.trim().slice(0, 60),
      city: input.city.trim().slice(0, 60),
      font: "fraunces",
      colors: vertical.defaultColors,
      legal: defaultLegal(businessName),
    })
    .select("id, slug")
    .single();
  if (error || !page) return { error: "Impossible de créer la page." };

  // Prestations pré-remplies du métier
  for (let fi = 0; fi < vertical.families.length; fi++) {
    const fam = vertical.families[fi];
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

  // Boutique pré-remplie du métier (verticals product/hybrid uniquement).
  const productCategories = vertical.productCategories ?? [];
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

  // Active le nouveau projet et avance l'onboarding.
  await supabase
    .from("profiles")
    .update({ onboarding_step: 2, active_page_id: page.id })
    .eq("user_id", user.id);

  revalidatePath("/ma-page");
  revalidatePath("/projets");
  revalidatePath(`/p/${page.slug}`);
  return { slug: page.slug };
}

// Autosave des champs simples de la vitrine — dans le BROUILLON (pages.draft).
// Le site public ne bouge pas tant que la version n'est pas publiée (5 cr.).
// Merge jsonb côté SQL (merge_page_draft) pour éviter les races de l'autosave.
export async function savePageFields(
  pageId: string,
  fields: Partial<PageDraftFields>
): Promise<{ error?: string }> {
  // Le contenu des blocs vit dans le draft jsonb : on borne sa taille.
  if (fields.sections) {
    if (fields.sections.length > SECTION_LIMITS.maxSections) {
      return { error: "Trop de sections sur la page." };
    }
    for (const section of fields.sections) {
      const settings = (section.settings ?? {}) as Record<string, unknown>;
      for (const value of Object.values(settings)) {
        if (typeof value === "string" && value.length > SECTION_LIMITS.maxBodyLength) {
          return { error: "Un des textes de section est trop long." };
        }
      }
      if (
        section.type === "faq" &&
        section.settings.items.length > SECTION_LIMITS.maxFaqItems
      ) {
        return { error: "Trop de questions dans la FAQ." };
      }
    }
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_page_draft", {
    pid: pageId,
    fields,
  });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/ma-page");
  return {};
}

export type PublishError =
  | "insufficient_credits"
  | "nothing_to_publish"
  | "subscription_required"
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
    return { error: "unknown" };
  }

  revalidatePath("/ma-page");
  revalidatePath("/offres");
  revalidatePath(`/p/${page.slug}`);
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
  if (!user) return { error: "Non connecté." };

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  if (!page) return { error: "Page introuvable." };

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
  if (!user) return { error: "Non connecté." };

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  if (!page) return { error: "Page introuvable." };

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
