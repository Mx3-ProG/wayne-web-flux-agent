"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVertical } from "@/lib/verticals";
import { defaultLegal } from "@/lib/legal";
import type { Page } from "@/lib/types";

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

  // Horaires par défaut : mardi → samedi, 9h-19h. Modifiables dans l'agenda.
  await supabase.from("schedules").insert(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      page_id: page.id,
      weekday,
      open: weekday >= 2 && weekday <= 6,
      ranges: weekday >= 2 && weekday <= 6 ? [["09:00", "19:00"]] : [],
    }))
  );

  await supabase
    .from("profiles")
    .update({ onboarding_step: 2 })
    .eq("user_id", user.id);

  revalidatePath("/ma-page");
  revalidatePath(`/p/${page.slug}`);
  return { slug: page.slug };
}

// Autosave des champs simples de la vitrine.
export async function savePageFields(
  pageId: string,
  fields: Partial<
    Pick<
      Page,
      | "business_name"
      | "job_title"
      | "tagline"
      | "city"
      | "address"
      | "phone"
      | "socials"
      | "colors"
      | "font"
      | "theme"
      | "logo_url"
      | "hero_url"
      | "gallery"
      | "reviews"
      | "offer"
      | "hours_text"
      | "legal"
    >
  >
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pages")
    .update(fields)
    .eq("id", pageId); // RLS : seule la page du user connecté est modifiable
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/ma-page");
  return {};
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
