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
import { defaultLocale, hasLocale } from "@/lib/i18n/config";
import {
  FluxPrefillOutputSchema,
  FluxSiteOutputSchema,
  toAnthropicSchema,
} from "@/lib/flux/schemas";
import { repairFluxPrefillOutput, repairFluxSiteOutput } from "@/lib/flux/repair";
import { rateLimit } from "@/lib/rate-limit";
import { resolveSections, SECTION_LIMITS } from "@/lib/sections";
import { PREFILL_COST } from "@/lib/tools-config";
import { SITE_GENERATE_COST } from "@/lib/plans";
import type { PageDraftFields, PageSeo, Service, VoiceProfile } from "@/lib/types";
import { DESIGN_KIT_BY_ID, registryContext } from "@/lib/vitrine-design/registry";
import { designConfigError, legacyAppearance } from "@/lib/vitrine-design/resolver";
import { recordAiUsage } from "@/lib/ai-usage";

export type FluxPrefillError =
  | "flux_requires_payment"
  | "flux_credits_expired"
  | "account_suspended"
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
  const locale = page.default_locale && hasLocale(page.default_locale) ? page.default_locale : defaultLocale;

  const access = await checkFluxAccess(user.id);
  if (!access.ok) return { error: access.reason };

  if (!rateLimit(`flux-prefill:${user.id}`, 3, 300_000)) {
    return { error: "too_many_requests" };
  }

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

  // Modération du contexte AVANT tout débit : on ne facture jamais un contenu
  // bloqué (mêmes garanties que fluxGenerateSite sur le brief).
  const contextModeration = await enforceKarlMada(
    { page, services, voice },
    { userId: user.id, pageId, surface: "flux-prefill:input" }
  );
  if (contextModeration.error) return { error: "content_blocked" };

  // Débit atomique AVANT génération.
  const spend = await spendCredits(user.id, PREFILL_COST, "flux:prefill");
  if (spend.error === "subscription_required") return { error: "subscription_required" };
  if (spend.error === "insufficient_credits") return { error: "insufficient_credits" };
  if (spend.error) return { error: "unknown" };

  const aiStartedAt = Date.now();
  let usageRecorded = false;
  // Idem fluxGenerateSite : une fois le brouillon écrit, plus de remboursement.
  let patchApplied = false;
  try {
    const system = [
      KARLMADA_AI_POLICY,
      fluxIdentity(),
      ...(await businessContext({ page, services, voice, locale })),
      ...(await learningsContext(page.vertical)),
      registryContext(),
      [
        "Ta mission : pré-remplir la vitrine de ce commerçant à partir de son métier, sa ville et ses prestations.",
        "- Accroche : une promesse spécifique au métier ET à la ville.",
        "- SEO : un titre et une description qui donnent envie de cliquer.",
        "- Section « à propos » : son histoire ou sa méthode, incarnée et concrète.",
        "- FAQ (3 à 5) : les vraies questions que ses clients se posent, avec des réponses utiles.",
        "Contenus directement utilisables, concrets, sans jargon ni phrase creuse. N'invente NI prix NI avis clients. Reste fidèle à son métier et à sa voix.",
      ].join("\n"),
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

    // Réparation avant revalidation (cf. repair.ts) : on n'abandonne pas une
    // sortie presque valide après facturation.
    let repaired: unknown = null;
    try {
      repaired = repairFluxPrefillOutput(JSON.parse(raw.text));
    } catch {
      repaired = null;
    }
    const parsed = repaired ? FluxPrefillOutputSchema.safeParse(repaired) : null;
    if (!parsed || !parsed.success) {
      // Facturé mais inexploitable même après réparation : incident + remboursement.
      await recordAiUsage({
        userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-prefill",
        usage: message.usage, startedAt: aiStartedAt, outcome: "error", errorCode: "unusable_output",
      });
      usageRecorded = true;
      await refundCredits(user.id, PREFILL_COST, "refund:flux-prefill:wasted-spend");
      return { error: "generation_failed" };
    }
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
      // Sortie IA bloquée : rien d'utilisable appliqué, on rembourse
      // (cohérent avec fluxGenerateSite).
      await refundCredits(user.id, PREFILL_COST, "refund:flux-prefill");
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
    patchApplied = true;

    // Coffre-fort : trace best-effort (n'échoue jamais l'action, ne rembourse jamais).
    try {
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
    } catch {
      // trace non bloquante
    }

    revalidatePath("/ma-page");
    return {};
  } catch {
    if (patchApplied) {
      revalidatePath("/ma-page");
      return {};
    }
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
  | "account_suspended"
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
  const locale = page.default_locale && hasLocale(page.default_locale) ? page.default_locale : defaultLocale;

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
  // Une fois le brouillon écrit, on ne rembourse plus JAMAIS : les tokens sont
  // facturés et le site est livré. Seul un échec AVANT écriture rembourse.
  let patchApplied = false;
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
      ...(await businessContext({ page, services, voice, locale })),
      ...(await learningsContext(page.vertical)),
      [
        "Ta mission : créer TOUTE la vitrine de ce commerçant à partir de son brief et de son métier. Pars du template de son métier et améliore-le.",
        "- Accroche (tagline) : une promesse claire et spécifique au métier ET à la ville, jamais un slogan creux.",
        "- SEO : un titre (≤70 caractères) et une description (≤200 caractères) qui donnent envie de cliquer, avec le métier et la ville.",
        "- Ambiance : un kit, une couleur d’accent #RRGGBB et un mode clair ou sombre. Ne génère jamais les couleurs de surface ou de texte : le moteur FLUX les dérive.",
        "- 2 à 5 sections riches et concrètes (à propos, texte, FAQ) : chacune apporte une information utile et différenciante (méthode, bénéfices, garanties, déroulé, réponses aux vraies questions des clients). Zéro remplissage générique.",
        "Écris à la première personne, concret et direct, sans jargon marketing ni phrase creuse. N'invente NI prix NI avis clients. Reste fidèle à son métier et à sa voix.",
      ].join("\n"),
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

    // Réparation avant revalidation : on récupère une sortie « presque valide »
    // (hex approximatif, textes trop longs, trop de sections) au lieu de la
    // jeter. fallback = couleurs actuelles de la page.
    const fallbackAppearance = legacyAppearance(page);
    let repaired: unknown = null;
    try {
      repaired = repairFluxSiteOutput(JSON.parse(raw.text), fallbackAppearance);
    } catch {
      repaired = null;
    }
    const parsed = repaired ? FluxSiteOutputSchema.safeParse(repaired) : null;
    if (!parsed || !parsed.success) {
      // Tokens facturés mais sortie inexploitable même après réparation : c'est
      // un incident (bug modèle / troncature), pas un fonctionnement normal. On
      // le journalise distinctement (wasted_spend) puis on rembourse l'utilisateur.
      await recordAiUsage({
        userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-site",
        usage: final.usage, startedAt: aiStartedAt, outcome: "error", errorCode: "unusable_output",
      });
      usageRecorded = true;
      await refundCredits(user.id, SITE_GENERATE_COST, "refund:flux-site:wasted-spend");
      return { error: "generation_failed" };
    }
    const out = parsed.data;

    // Les enums empêchent les identifiants inventés ; cette seconde barrière
    // refuse aussi une variante réelle mais incompatible avec le kit choisi.
    if (designConfigError(out.design)) {
      await recordAiUsage({
        userId: user.id, pageId, model: GENERATION_MODEL, operation: "flux-site",
        usage: final.usage, startedAt: aiStartedAt, outcome: "error", errorCode: "incompatible_design",
      });
      usageRecorded = true;
      await refundCredits(user.id, SITE_GENERATE_COST, "refund:flux-site:incompatible-design");
      return { error: "generation_failed" };
    }

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
      appearance: out.appearance,
    };

    const existing = resolveSections(page);
    const additions = out.sections.map(buildGeneratedSection);
    const room = SECTION_LIMITS.maxSections - existing.length;
    const sections =
      room > 0 ? [...existing, ...additions.slice(0, room)] : existing;

    const applied = await applyFluxPatch(supabase, pageId, { fields, sections });
    if (applied.error) throw new Error(applied.error);
    // Brouillon écrit : à partir d'ici, plus aucun remboursement.
    patchApplied = true;

    // Journalisation best-effort : un échec ici ne doit ni faire échouer
    // l'action (le site est déjà écrit) ni déclencher de remboursement.
    try {
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
    } catch {
      // trace non bloquante
    }

    revalidatePath("/ma-page");
    return {};
  } catch {
    // Le site n'a pas été écrit (échec avant/pendant génération) : on rembourse.
    if (patchApplied) {
      revalidatePath("/ma-page");
      return {};
    }
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
