"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canUseCustomDomain } from "@/lib/plans";
import { CUSTOM_DOMAIN_ENABLED } from "@/lib/config";
import type { Plan } from "@/lib/types";

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/;

// Nom de domaine personnalisé — fonctionnel en local seulement (« à venir » en
// prod), réservé aux formules Pro et supérieures.
export async function setCustomDomain(
  pageId: string,
  domain: string
): Promise<{ error?: string }> {
  if (!CUSTOM_DOMAIN_ENABLED) {
    return { error: "feature_coming_soon" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single();
  if (!canUseCustomDomain((profile?.plan as Plan) ?? "basique")) {
    return { error: "plan_restricted" };
  }

  const value = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (value && !DOMAIN_RE.test(value)) {
    return { error: "invalid_domain" };
  }

  // RLS "own page" : seule une page du user est modifiable.
  const { error } = await supabase
    .from("pages")
    .update({ custom_domain: value || null })
    .eq("id", pageId)
    .eq("user_id", user.id);
  if (error) return { error: "save_failed" };

  revalidatePath("/projets");
  return {};
}

// Change le projet actif du user. Vérifie la propriété avant.
export async function setActiveProject(pageId: string): Promise<{ error?: string }> {
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
    .maybeSingle();
  if (!page) return { error: "project_not_found" };

  const { error } = await supabase
    .from("profiles")
    .update({ active_page_id: pageId })
    .eq("user_id", user.id);
  if (error) return { error: "change_failed" };

  // Tout le dashboard dépend du projet actif → on revalide largement.
  revalidatePath("/", "layout");
  return {};
}
