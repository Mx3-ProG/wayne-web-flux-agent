import type { VoiceProfile } from "@/lib/types";

// Score de complétion du profil de voix — le « J'écris comme toi à N% ».
// Base 40% dès qu'une vitrine existe (l'IA connaît le métier, la ville,
// les prestations), puis chaque réponse affine la voix.
export function voiceCompletion(voice: VoiceProfile | null, hasPage: boolean): number {
  let score = hasPage ? 40 : 10;
  if (!voice) return score;
  if (voice.tone) score += 12;
  if (voice.address_form) score += 10;
  if (voice.emojis) score += 8;
  if (voice.specialty) score += 10;
  if (voice.often_told) score += 5;
  if (voice.story) score += 8;
  if (voice.vals) score += 7;
  return Math.min(100, score);
}
