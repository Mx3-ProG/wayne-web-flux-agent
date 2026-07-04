"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canUseCustomDomain } from "@/lib/plans";
import { CUSTOM_DOMAIN_ENABLED } from "@/lib/config";
import type { Plan } from "@/lib/types";

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/;

// Nom de domaine personnalisé — fonctionnel en local seulement (« à venir » en
// prod), réservé au forfait Plus.
export async function setCustomDomain(
  pageId: string,
  domain: string
): Promise<{ error?: string }> {
  if (!CUSTOM_DOMAIN_ENABLED) {
    return { error: "Fonction bientôt disponible." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single();
  if (!canUseCustomDomain((profile?.plan as Plan) ?? "free")) {
    return { error: "Réservé au forfait Plus." };
  }

  const value = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (value && !DOMAIN_RE.test(value)) {
    return { error: "Nom de domaine invalide (ex. ma-boutique.fr)." };
  }

  // RLS "own page" : seule une page du user est modifiable.
  const { error } = await supabase
    .from("pages")
    .update({ custom_domain: value || null })
    .eq("id", pageId)
    .eq("user_id", user.id);
  if (error) return { error: "Enregistrement impossible (domaine déjà pris ?)." };

  revalidatePath("/projets");
  return {};
}

// Change le projet actif du user. Vérifie la propriété avant.
export async function setActiveProject(pageId: string): Promise<{ error?: string }> {
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
    .maybeSingle();
  if (!page) return { error: "Projet introuvable." };

  const { error } = await supabase
    .from("profiles")
    .update({ active_page_id: pageId })
    .eq("user_id", user.id);
  if (error) return { error: "Changement impossible." };

  // Tout le dashboard dépend du projet actif → on revalide largement.
  revalidatePath("/", "layout");
  return {};
}
