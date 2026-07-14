"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { anthropic, GENERATION_MODEL, FLUX_MAX_TOKENS } from "@/lib/claude";
import { createAdminClient } from "@/lib/supabase/admin";
import { spendCredits, refundCredits } from "@/lib/credits";
import { requirePaidFlux } from "@/lib/flux/access";
import { fluxIdentity, businessContext, learningsContext } from "@/lib/flux/persona";
import { applyFluxPatch } from "@/lib/flux/apply";
import { buildGeneratedSection } from "@/lib/flux/guardrails";
import {
  FluxPrefillOutputSchema,
  toAnthropicSchema,
} from "@/lib/flux/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { resolveSections, SECTION_LIMITS } from "@/lib/sections";
import { PREFILL_COST } from "@/lib/tools-config";
import type { PageDraftFields, Service, VoiceProfile } from "@/lib/types";

export type FluxPrefillError =
  | "flux_requires_payment"
  | "insufficient_credits"
  | "subscription_required"
  | "too_many_requests"
  | "generation_failed"
  | "unknown";

// Pré-remplissage IA de la vitrine (PREFILL_COST crédits). Réservé aux comptes
// payants (requirePaidFlux). Débit AVANT génération, remboursement si l'appel
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

  // Verrou payant : l'IA n'aide pas les comptes en essai gratuit.
  const access = await requirePaidFlux(user.id);
  if (access.error) return { error: access.error };

  if (!rateLimit(`flux-prefill:${user.id}`, 3, 300_000)) {
    return { error: "too_many_requests" };
  }

  // Débit atomique AVANT génération.
  const spend = await spendCredits(user.id, PREFILL_COST, "flux:prefill");
  if (spend.error === "subscription_required") return { error: "subscription_required" };
  if (spend.error === "insufficient_credits") return { error: "insufficient_credits" };
  if (spend.error) return { error: "unknown" };

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

    const system = [
      fluxIdentity(),
      ...businessContext({ page, services, voice }),
      ...(await learningsContext(page.vertical)),
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
    const admin = createAdminClient();
    await admin.from("generations").insert({
      user_id: user.id,
      page_id: page.id,
      tool_slug: "flux-prefill",
      inputs: {},
      output: raw.text,
      credits_spent: PREFILL_COST,
    });

    revalidatePath("/ma-page");
    return {};
  } catch {
    // Rien d'utilisable produit : on rembourse.
    await refundCredits(user.id, PREFILL_COST, "refund:flux-prefill");
    return { error: "generation_failed" };
  }
}
