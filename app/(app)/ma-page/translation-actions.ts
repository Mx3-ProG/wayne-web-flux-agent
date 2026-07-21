"use server";

// Gestion des langues d'une boutique côté éditeur (Lot 7) : activation /
// désactivation d'une langue publique (facturation via set_page_locales,
// migration 00036/00037 — jamais réimplémentée ici), statut de traduction
// par langue et retry d'un job en erreur.
//
// Volontairement séparé de actions.ts (brouillon + publication) : ces
// actions modifient pages.enabled_locales directement et sont facturées
// immédiatement, contrairement à l'autosave du brouillon.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, type Locale } from "@/lib/i18n/config";

async function ownedPage(pageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, page: null };
  const { data: page } = await supabase
    .from("pages")
    .select("id, default_locale, enabled_locales")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single<{ id: string; default_locale: Locale; enabled_locales: Locale[] }>();
  return { supabase, user, page };
}

export type LocaleStatus = "up_to_date" | "in_progress" | "stale" | "error";

export type LocaleStatusRow = {
  locale: Locale;
  status: LocaleStatus;
  lastError: string | null;
  translatedEntities: number;
  totalEntities: number;
};

// Active une langue supplémentaire (ou change la langue principale) : coût
// = 25 crédits par langue pas encore payée sur ce projet
// (page_locale_entitlements), jamais deux fois pour la même — voir
// set_page_locales. L'activation déclenche la mise en file des traductions
// via le trigger enqueue_translations_after_locale_change (migration 00038).
export async function activatePageLocale(
  pageId: string,
  locale: string
): Promise<{ error?: string; balance?: number; enabledLocales?: Locale[] }> {
  if (!hasLocale(locale)) return { error: "invalid_locale" };
  const { user, page } = await ownedPage(pageId);
  if (!user || !page) return { error: "page_not_found" };
  if (page.enabled_locales.includes(locale)) return { error: "already_active" };

  const supabase = await createClient();
  const nextLocales = Array.from(new Set([...page.enabled_locales, locale]));
  const { data: balance, error } = await supabase.rpc("set_page_locales", {
    pid: pageId,
    primary_locale: page.default_locale,
    locales: nextLocales,
  });
  if (error?.message.includes("insufficient_credits")) {
    return { error: "insufficient_credits" };
  }
  if (error) return { error: "activation_failed" };

  revalidatePath("/ma-page");
  return { balance: balance ?? undefined, enabledLocales: nextLocales };
}

// Désactive une langue publique : ne supprime jamais localized_content (le
// contenu traduit reste en base, prêt à resservir si la langue est
// réactivée), retire simplement la langue de enabled_locales — le loader
// public cesse alors de la proposer (voir lib/vitrine-loader.ts).
export async function deactivatePageLocale(
  pageId: string,
  locale: string
): Promise<{ error?: string; enabledLocales?: Locale[] }> {
  if (!hasLocale(locale)) return { error: "invalid_locale" };
  const { user, page } = await ownedPage(pageId);
  if (!user || !page) return { error: "page_not_found" };
  if (locale === page.default_locale) return { error: "cannot_deactivate_main" };
  if (!page.enabled_locales.includes(locale)) return {};

  const supabase = await createClient();
  const nextLocales = page.enabled_locales.filter((l) => l !== locale);
  const { error } = await supabase.rpc("set_page_locales", {
    pid: pageId,
    primary_locale: page.default_locale,
    locales: nextLocales,
  });
  if (error) return { error: "deactivation_failed" };

  revalidatePath("/ma-page");
  return { enabledLocales: nextLocales };
}

// Relance un job de traduction en erreur, sans le dupliquer ni recharger de
// crédits (même job, même source_version — voir la contrainte unique de
// translation_jobs, migration 00034).
export async function retryLocaleTranslation(
  pageId: string,
  locale: string
): Promise<{ error?: string }> {
  if (!hasLocale(locale)) return { error: "invalid_locale" };
  const { user, page } = await ownedPage(pageId);
  if (!user || !page) return { error: "page_not_found" };

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("translation_jobs")
    .select("id")
    .eq("page_id", pageId)
    .eq("locale", locale)
    .eq("status", "error")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job) return { error: "no_failed_job" };

  const { error } = await supabase
    .from("translation_jobs")
    .update({ status: "queued", available_at: new Date().toISOString(), last_error: null })
    .eq("id", job.id);
  if (error) return { error: "retry_failed" };

  revalidatePath("/ma-page");
  return {};
}

// Statut de traduction par langue activée (hors langue principale) : agrège
// le dernier job (en cours / en erreur) et la complétude de
// localized_content (published_fields) pour distinguer "à jour" de "en
// attente de première traduction".
export async function getPageLocaleStatuses(pageId: string): Promise<LocaleStatusRow[]> {
  const { user, page } = await ownedPage(pageId);
  if (!user || !page) return [];

  const nonDefaultLocales = page.enabled_locales.filter((l) => l !== page.default_locale);
  if (nonDefaultLocales.length === 0) return [];

  const supabase = await createClient();
  const [{ data: jobs }, { data: content }] = await Promise.all([
    supabase
      .from("translation_jobs")
      .select("locale, status, last_error, created_at")
      .eq("page_id", pageId)
      .in("locale", nonDefaultLocales)
      .order("created_at", { ascending: false }),
    supabase
      .from("localized_content")
      .select("locale, published_fields, status")
      .eq("page_id", pageId)
      .in("locale", nonDefaultLocales),
  ]);

  return nonDefaultLocales.map((locale) => {
    const latestJob = (jobs ?? []).find((j) => j.locale === locale);
    const rows = (content ?? []).filter((c) => c.locale === locale);
    const translatedEntities = rows.filter((r) => r.published_fields !== null).length;
    const totalEntities = rows.length;

    let status: LocaleStatus;
    if (latestJob?.status === "queued" || latestJob?.status === "processing") {
      status = "in_progress";
    } else if (latestJob?.status === "error") {
      status = "error";
    } else if (rows.some((r) => r.status === "error")) {
      status = "error";
    } else if (totalEntities > 0 && translatedEntities === totalEntities) {
      status = "up_to_date";
    } else if (totalEntities > 0) {
      status = "stale";
    } else {
      // Langue tout juste activée : le job de mise en file n'est pas encore
      // visible (trigger AFTER UPDATE, requête concurrente possible).
      status = "in_progress";
    }

    return {
      locale,
      status,
      lastError: latestJob?.status === "error" ? latestJob.last_error : null,
      translatedEntities,
      totalEntities,
    };
  });
}
