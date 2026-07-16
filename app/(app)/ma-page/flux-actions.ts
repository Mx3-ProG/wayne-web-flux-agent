"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anthropic, GENERATION_MODEL, FLUX_MAX_TOKENS } from "@/lib/claude";
import { createAdminClient } from "@/lib/supabase/admin";
import { spendCredits, refundCredits } from "@/lib/credits";
import { checkFluxAccess } from "@/lib/flux/access";
import { fluxIdentity, businessContext, learningsContext } from "@/lib/flux/persona";
import { applyFluxPatch } from "@/lib/flux/apply";
import { buildGeneratedSection } from "@/lib/flux/guardrails";
import { enforceKarlMada, KARLMADA_AI_POLICY } from "@/lib/karlmada";
import {
  FluxPrefillOutputSchema,
  FluxSiteOutputSchema,
  toAnthropicSchema,
} from "@/lib/flux/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { resolveSections, SECTION_LIMITS } from "@/lib/sections";
import { PREFILL_COST } from "@/lib/tools-config";
import { SITE_GENERATE_COST } from "@/lib/plans";
import type { PageColors, PageDraftFields, PageSeo, Service, VoiceProfile } from "@/lib/types";
import { DESIGN_KIT_BY_ID, registryContext } from "@/lib/vitrine-design/registry";
import { recordAiUsage } from "@/lib/ai-usage";

export type FluxPrefillError =
  | "flux_requires_payment"
  | "flux_credits_expired"
  | "insufficient_credits"
  | "subscription_required"
  | "too_many_requests"
  | "content_blocked"
  | "generation_failed"
  | "unknown";

// Pré-remplissage IA de la vitrine (PREFILL_COST crédits). Accès via
// checkFluxAccess : ouvert tant qu'il reste des crédits utilisables, sans
// quota. Débit AVANT génération, remboursement si l'appel
// échoue — même pattern que saveVitrineGuide. FLUX écrit dans le BROUILLON :
// l'utilisateur relit puis publie lui-même.
//
// Non destructif : ne remplit que les champs vides (tagline, seo) et ajoute
// deux sections (à propos + FAQ) à la suite des sections existantes.
export async function fluxPrefill(
  pageId: string
): Promise<{ error?: FluxPrefillError }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unknown" };

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  if (!page) return { error: "unknown" };

  const access = await checkFluxAccess(user.id);
  if (!access.ok) return { error: access.reason };

  if (!rateLimit(`flux-prefill:${user.id}`, 3, 300_000)) {
    return { error: "too_many_requests" };
  }

  // Débit atomique AVANT génération.
  const spend = await spendCredits(user.id, PREFILL_COST, "flux:prefill");
  if (spend.error === "subscription_required") return { error: "subscription_required" };
  if (spend.error === "insufficient_credits") return { error: "insufficient_credits" };
  if (spend.error) return { error: "unknown" };

  const aiStartedAt = Date.now();
  let usageRecorded = false;
  try {
    // Contexte : prestations + profil de voix du projet.
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase
        .from("voice_profiles")
        .select("*")
        .eq("page_id", page.id)
        .maybeSingle<VoiceProfile>(),
      supabase.from("services").select("*").eq("page_id", page.id).order("position"),
    ]);
    const voice = v ?? null;
    const services = (s ?? []) as Service[];

    const contextModeration = await enforceKarlMada(
      { page, services, voice },
      { userId: user.id, pageId, surface: "flux-prefill:input" }
    );
    if (contextModeration.error) return { error: "content_blocked" };

    const system = [
      KARLMADA_AI_POLICY,
      fluxIdentity(),
      ...businessContext({ page, services, voice }),
      ...(await learningsContext(page.vertical)),
      registryContext(),
      "Ta mission : pré-remplir la vitrine de ce commerçant à partir de son métier, sa ville et ses prestations. Écris des contenus concrets, directs, sans jargon marketing ni phrase creuse, directement utilisables. N'invente NI prix NI avis clients. Reste fidèle à son métier et à sa voix.",
    ].join("\n\n");

    const message = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: FLUX_MAX_TOKENS.prefill,
      thinking: { type: "disabled" },
      system,
      messages: [
        {
          role: "user",
          content:
            "Propose : une phrase d'accroche (tagline) percutante ; un titre et une description SEO pour Google ; une section « à propos » (titre + paragraphe) ; et une FAQ de 3 à 5 questions/réponses utiles pour mes clients.",
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: toAnthropicSchema(FluxPrefillOutputSchema),
        },
      },
    });

    const raw = message.content.find((b) => b.type === "text");
    if (!raw || raw.type !== "text") throw new Error("no_output");
    const parsed = FluxPrefillOutputSchema.safeParse(JSON.parse(raw.text));
    if (!parsed.success) throw new Error("invalid_output");
    const out = parsed.data;
    const generatedModeration = await enforceKarlMada(out, {
      userId: user.id,
      pageId,
      surface: "flux-prefill:output",
    });
    if (generatedModeration.error) {
      await recordAiUsage({
        userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-prefill",
        usage: message.usage, startedAt: aiStartedAt, outcome: "blocked",
      });
      usageRecorded = true;
      return { error: "content_blocked" };
    }

    // Patch non destructif : uniquement les champs vides.
    const fields: Partial<PageDraftFields> = {};
    if (!page.tagline?.trim()) fields.tagline = out.tagline;
    const seo = (page.seo ?? {}) as { title?: string; description?: string };
    if (!seo.title && !seo.description) {
      fields.seo = { ...seo, title: out.seo.title, description: out.seo.description };
    }

    // Ajout des sections « à propos » + FAQ à la suite des sections existantes
    // (ids uuid générés serveur), dans la limite du nombre de sections.
    const existing = resolveSections(page);
    const additions = [
      buildGeneratedSection({ type: "a_propos", title: out.about.title, body: out.about.body }),
      buildGeneratedSection({ type: "faq", items: out.faq }),
    ];
    const room = SECTION_LIMITS.maxSections - existing.length;
    const sections =
      room > 0 ? [...existing, ...additions.slice(0, room)] : undefined;

    const applied = await applyFluxPatch(supabase, pageId, {
      fields,
      ...(sections ? { sections } : {}),
    });
    if (applied.error) throw new Error(applied.error);

    // Coffre-fort : trace de la génération.
    const aiUsageEventId = await recordAiUsage({
      userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-prefill",
      usage: message.usage, startedAt: aiStartedAt, outcome: "success",
    });
    usageRecorded = true;
    const admin = createAdminClient();
    await admin.from("generations").insert({
      user_id: user.id,
      page_id: page.id,
      tool_slug: "flux-prefill",
      inputs: {},
      output: raw.text,
      credits_spent: PREFILL_COST,
      ai_usage_event_id: aiUsageEventId,
    });

    revalidatePath("/ma-page");
    return {};
  } catch {
    if (!usageRecorded) {
      await recordAiUsage({
        userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-prefill",
        startedAt: aiStartedAt, outcome: "error", errorCode: "generation_failed",
      });
    }
    // Rien d'utilisable produit : on rembourse.
    await refundCredits(user.id, PREFILL_COST, "refund:flux-prefill");
    return { error: "generation_failed" };
  }
}

export type FluxSiteError =
  | "flux_requires_payment"
  | "flux_credits_expired"
  | "insufficient_credits"
  | "subscription_required"
  | "too_many_requests"
  | "empty_brief"
  | "content_blocked"
  | "generation_failed"
  | "unknown";

// Génération complète de la vitrine par brief (SITE_GENERATE_COST crédits).
// FLUX part du template métier et du brief pour écrire toute la vitrine : textes,
// SEO, ambiance (thème + couleurs) et 2 à 5 sections. Écrit dans le BROUILLON
// (jamais en live) ; l'utilisateur relit puis publie lui-même. Ouvert à tout
// compte ayant des crédits utilisables (checkFluxAccess), essai expiré compris.
// Débit avant génération, remboursement si échec.
export async function fluxGenerateSite(
  pageId: string,
  brief: string
): Promise<{ error?: FluxSiteError }> {
  const cleanBrief = brief.trim().slice(0, 1500);
  if (!cleanBrief) return { error: "empty_brief" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unknown" };

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .eq("user_id", user.id)
    .single();
  if (!page) return { error: "unknown" };

  const access = await checkFluxAccess(user.id);
  if (!access.ok) return { error: access.reason };

  if (!rateLimit(`flux-site:${user.id}`, 3, 600_000)) {
    return { error: "too_many_requests" };
  }

  // Modération du brief AVANT tout débit : on ne facture jamais un contenu bloqué.
  const briefModeration = await enforceKarlMada(cleanBrief, {
    userId: user.id,
    pageId,
    surface: "flux-site:brief",
  });
  if (briefModeration.error) return { error: "content_blocked" };

  const spend = await spendCredits(user.id, SITE_GENERATE_COST, "flux:site");
  if (spend.error === "subscription_required") return { error: "subscription_required" };
  if (spend.error === "insufficient_credits") return { error: "insufficient_credits" };
  if (spend.error) return { error: "unknown" };

  const aiStartedAt = Date.now();
  let usageRecorded = false;
  try {
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase
        .from("voice_profiles")
        .select("*")
        .eq("page_id", page.id)
        .maybeSingle<VoiceProfile>(),
      supabase.from("services").select("*").eq("page_id", page.id).order("position"),
    ]);
    const voice = v ?? null;
    const services = (s ?? []) as Service[];

    const system = [
      KARLMADA_AI_POLICY,
      fluxIdentity(),
      ...businessContext({ page, services, voice }),
      ...(await learningsContext(page.vertical)),
      "Ta mission : créer TOUTE la vitrine de ce commerçant à partir de son brief et de son métier. Pars du template de son métier et améliore-le : accroche, SEO, ambiance (thème + couleurs cohérentes), et 2 à 5 sections de contenu (à propos, texte, FAQ). Concret, direct, sans jargon marketing. N'invente NI prix NI avis clients. Reste fidèle à son métier et à sa voix.",
    ].join("\n\n");

    const message = await anthropic.messages.stream({
      model: GENERATION_MODEL,
      max_tokens: FLUX_MAX_TOKENS.site,
      thinking: { type: "disabled" },
      system,
      messages: [
        {
          role: "user",
          content: `Voici mon commerce, en mes mots :\n${cleanBrief}\n\nCrée-moi la vitrine complète.`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: toAnthropicSchema(FluxSiteOutputSchema),
        },
      },
    });
    const final = await message.finalMessage();

    const raw = final.content.find((b) => b.type === "text");
    if (!raw || raw.type !== "text") throw new Error("no_output");
    const parsed = FluxSiteOutputSchema.safeParse(JSON.parse(raw.text));
    if (!parsed.success) throw new Error("invalid_output");
    const out = parsed.data;

    const moderation = await enforceKarlMada(out, {
      userId: user.id,
      pageId,
      surface: "flux-site:output",
    });
    if (moderation.error) {
      await recordAiUsage({
        userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-site",
        usage: final.usage, startedAt: aiStartedAt, outcome: "blocked",
      });
      usageRecorded = true;
      await refundCredits(user.id, SITE_GENERATE_COST, "refund:flux-site");
      return { error: "content_blocked" };
    }

    // Génération complète (intention explicite « crée toute ma vitrine ») :
    // on applique accroche, SEO, ambiance et sections. Tout va au brouillon.
    const seo = (page.seo ?? {}) as PageSeo;
    const fields: Partial<PageDraftFields> = {
      tagline: out.tagline,
      seo: { ...seo, title: out.seo.title, description: out.seo.description },
      theme: DESIGN_KIT_BY_ID.get(out.design.kitId)?.legacyTheme ?? out.theme,
      design: out.design,
      colors: { ...(page.colors as PageColors), primary: out.colors.primary, dark: out.colors.dark },
    };

    const existing = resolveSections(page);
    const additions = out.sections.map(buildGeneratedSection);
    const room = SECTION_LIMITS.maxSections - existing.length;
    const sections =
      room > 0 ? [...existing, ...additions.slice(0, room)] : existing;

    const applied = await applyFluxPatch(supabase, pageId, { fields, sections });
    if (applied.error) throw new Error(applied.error);

    const aiUsageEventId = await recordAiUsage({
      userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-site",
      usage: final.usage, startedAt: aiStartedAt, outcome: "success",
    });
    usageRecorded = true;
    const admin = createAdminClient();
    await admin.from("generations").insert({
      user_id: user.id,
      page_id: page.id,
      tool_slug: "flux-site",
      inputs: { brief: cleanBrief },
      output: raw.text,
      credits_spent: SITE_GENERATE_COST,
      ai_usage_event_id: aiUsageEventId,
    });

    revalidatePath("/ma-page");
    return {};
  } catch {
    if (!usageRecorded) {
      await recordAiUsage({
        userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-site",
        startedAt: aiStartedAt, outcome: "error", errorCode: "generation_failed",
      });
    }
    await refundCredits(user.id, SITE_GENERATE_COST, "refund:flux-site");
    return { error: "generation_failed" };
  }
}
