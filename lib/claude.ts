import Anthropic from "@anthropic-ai/sdk";
import type { Page, Service, VoiceProfile } from "@/lib/types";
import { getVertical } from "@/lib/verticals";
import type { Tool } from "@/lib/tools-config";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const GENERATION_MODEL = "claude-sonnet-5";

// Construit le prompt : contexte métier + profil de voix + données vitrine.
// Plus le commerçant a rempli sa voix, plus le contenu lui ressemble.
export function buildPrompt(options: {
  tool: Tool;
  inputs: Record<string, string>;
  page: Page | null;
  services: Service[];
  voice: VoiceProfile | null;
}): { system: string; user: string } {
  const { tool, inputs, page, services, voice } = options;
  const vertical = getVertical(page?.vertical ?? "autre");

  const parts: string[] = [
    "Tu écris des contenus marketing en français pour un commerçant indépendant. Tu écris À SA PLACE, en son nom (première personne).",
    `Contexte métier : ${vertical.promptContext}`,
  ];

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

  parts.push(
    "Règles : concret, direct, zéro jargon marketing, zéro phrase creuse. Le contenu doit être directement utilisable, sans retouche. Réponds en Markdown léger (titres ##, listes), sans préambule ni commentaire final.",
    `Consigne de l'outil : ${tool.systemHint}`
  );

  const inputLines = tool.fields
    .map((f) => {
      const value = inputs[f.id];
      if (!value) return null;
      const label =
        f.options?.find((o) => o.value === value)?.label ?? value;
      return `${f.label} : ${label}`;
    })
    .filter(Boolean);

  return {
    system: parts.join("\n\n"),
    user:
      inputLines.length > 0
        ? `Voici ma demande :\n${inputLines.join("\n")}`
        : "Propose-moi le contenu le plus utile pour remplir mon agenda cette semaine.",
  };
}
