import type { VoiceProfile } from "@/lib/types";

export type VoiceDraft = Omit<VoiceProfile, "user_id" | "page_id" | "updated_at">;

export const EMPTY_VOICE: VoiceDraft = {
  tone: "",
  address_form: "",
  emojis: "",
  specialty: "",
  often_told: "",
  story: "",
  vals: "",
};

// Structure INVARIANTE des 7 questions (ids stables, ordre, pluriel) : le
// texte (kicker/title/subtitle/options) vit dans le dictionnaire i18n
// "voice" — voir lib/i18n/dictionaries/*/voice.json#steps, chargé par
// l'appelant et fusionné avec cette structure (voir voice-tunnel.tsx).
//
// address_form et emojis : la "value" stockée EST l'identifiant ci-dessous,
// jamais traduite — voice-form.tsx compare dessus ("tu"/"vous",
// "beaucoup"/"parfois"/"jamais"). Les autres steps stockent une phrase
// sémantique traduite (envoyée telle quelle à FLUX).
export const VOICE_STEP_KEYS = [
  "tone",
  "address_form",
  "emojis",
  "specialty",
  "often_told",
  "story",
  "vals",
] as const;

export type VoiceStepKey = (typeof VOICE_STEP_KEYS)[number];

export const STEP_OPTION_IDS: Record<VoiceStepKey, readonly string[]> = {
  tone: [
    "complice_chaleureux",
    "pro_expert",
    "doux_pose",
    "solaire_petillant",
    "chic_raffine",
    "direct_efficace",
  ],
  address_form: ["tu", "vous"],
  emojis: ["beaucoup", "parfois", "jamais"],
  specialty: [
    "resultat_naturel",
    "precision",
    "qualite_durable",
    "sur_mesure",
    "juste_prix",
    "reactivite",
  ],
  often_told: [
    "prend_le_temps",
    "impeccable",
    "a_laise",
    "trouve_solution",
    "mieux_que_prevu",
    "compter_sur_toi",
  ],
  story: [
    "passion",
    "reconversion",
    "savoir_faire_transmis",
    "aventure_familiale",
    "envie_de_mieux",
    "entreprendre_localement",
  ],
  vals: ["qualite", "ecoute", "confiance", "authenticite", "fiabilite", "proximite"],
};

export const STEP_MULTIPLE: Partial<Record<VoiceStepKey, true>> = { vals: true };

// Champs dont la valeur stockée est un identifiant STABLE et jamais traduit
// (comparaisons littérales ailleurs — voir voice-form.tsx).
export const INVARIANT_VALUE_STEPS = new Set<VoiceStepKey>(["address_form", "emojis"]);
