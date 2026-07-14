import type { VoiceArchetype } from "../types";

export const VOICE_ARCHETYPES: VoiceArchetype[] = [
  { id: "voice-warm", name: "Proche et chaleureux", description: "Humain, simple et rassurant.", tags: ["local", "service"], status: "stable", prompt: "Écris avec chaleur, simplement, sans jargon ni surpromesse.", examples: ["Je prends le temps de comprendre ce qu’il vous faut.", "Passez me voir, je vous conseillerai avec plaisir."] },
  { id: "voice-expert", name: "Expert et clair", description: "Précis, crédible et pédagogique.", tags: ["expert", "btb"], status: "stable", prompt: "Écris avec précision et pédagogie. Explique les bénéfices concrets.", examples: ["Chaque intervention commence par un diagnostic clair.", "Vous savez ce qui est fait, pourquoi et à quel prix."] },
  { id: "voice-direct", name: "Direct et efficace", description: "Peu de mots, promesse nette.", tags: ["impact", "commerce"], status: "stable", prompt: "Écris court, actif et concret. Une idée forte par phrase.", examples: ["Commandez aujourd’hui. Retirez quand vous voulez.", "Du bon, du disponible, sans détour."] },
  { id: "voice-refined", name: "Chic et raffiné", description: "Élégant, sobre et haut de gamme.", tags: ["luxe", "premium"], status: "stable", prompt: "Écris avec retenue et précision, sans superlatifs faciles.", examples: ["Une attention particulière portée à chaque détail.", "Une expérience conçue pour durer au-delà du premier regard."] },
];
