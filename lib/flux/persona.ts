// Personnalité et contexte de FLUX — la « voix » du bot partagée par tous les
// points d'entrée IA (outils de génération, pré-remplissage, chat éditeur,
// génération complète). Extrait de buildPrompt (lib/claude.ts) pour rester une
// source unique.

import type { Page, Service, VoiceProfile } from "@/lib/types";
import { getLocalizedVertical } from "@/lib/verticals-i18n";
import type { Locale } from "@/lib/i18n/config";

// Identité de FLUX pour les surfaces conversationnelles (chat, brief). FLUX
// parle en son nom (« je »), mais rédige les contenus de la vitrine À LA PLACE
// du commerçant, en son nom (1re personne) — même règle que buildPrompt.
export function fluxIdentity(): string {
  return "Tu es FLUX, l'assistante qui construit et améliore la vitrine d'un commerçant indépendant. Tu t'adresses à lui en ton nom (« je »). Mais quand tu écris le contenu de sa vitrine, tu l'écris À SA PLACE, en son nom (première personne), jamais comme un tiers.";
}

// Bloc de contexte métier partagé par tous les prompts FLUX. La sortie doit
// rester IDENTIQUE à l'ancienne construction inline de buildPrompt (le prompt
// de /api/generate en dépend, ainsi que le cache implicite d'Anthropic).
export async function businessContext(options: {
  page: Page | null;
  services: Service[];
  voice: VoiceProfile | null;
  locale: Locale;
}): Promise<string[]> {
  const { page, services, voice, locale } = options;
  // La langue du contexte transmis à FLUX suit celle du projet (page.default_locale,
  // déjà résolue par l'appelant) — jamais figée en français.
  const vertical = await getLocalizedVertical(page?.vertical ?? "autre", locale);

  const parts: string[] = [`Contexte métier : ${vertical.promptContext}`];

  if (page) {
    parts.push(
      `Le commerce : « ${page.business_name} »${page.job_title ? `, ${page.job_title}` : ""}${page.city ? `, à ${page.city}` : ""}.${page.tagline ? ` Sa phrase : « ${page.tagline} »` : ""}`
    );
    if (services.length > 0) {
      parts.push(
        `Ses prestations : ${services
          .slice(0, 15)
          .map((s) => `${s.name} (${(s.price_cents / 100).toFixed(0)} €)`)
          .join(", ")}.`
      );
    }
    parts.push(
      `Le lien de réservation à mentionner quand c'est pertinent : ${process.env.NEXT_PUBLIC_SITE_URL}/p/${page.slug}`
    );
  }

  if (voice) {
    const voiceParts: string[] = [];
    if (voice.tone) voiceParts.push(`ton ${voice.tone}`);
    if (voice.address_form)
      voiceParts.push(
        voice.address_form === "tu"
          ? "tutoie ses clients (proximité)"
          : "vouvoie ses clients"
      );
    if (voice.emojis)
      voiceParts.push(
        voice.emojis === "beaucoup"
          ? "utilise volontiers des emojis"
          : voice.emojis === "jamais"
            ? "n'utilise JAMAIS d'emojis"
            : "utilise des emojis avec parcimonie"
      );
    if (voiceParts.length > 0)
      parts.push(`Sa voix : ${voiceParts.join(" ; ")}.`);
    if (voice.specialty) parts.push(`Sa signature : ${voice.specialty}.`);
    if (voice.often_told) parts.push(`Ce qu'on lui dit souvent : « ${voice.often_told} ».`);
    if (voice.story) parts.push(`Son histoire : ${voice.story}`);
    if (voice.vals) parts.push(`Ses valeurs : ${voice.vals}`);
  }

  return parts;
}

// Contexte d'apprentissage : les « valeurs fraîches » que FLUX a apprises des
// sites publiés de la verticale. Stub tant que la Phase 5 (observation &
// apprentissage) n'est pas livrée — renverra alors les flux_learnings actifs.
export async function learningsContext(vertical: string): Promise<string[]> {
  void vertical; // branché en Phase 5 (table flux_learnings)
  return [];
}
