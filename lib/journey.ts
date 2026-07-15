// Le Parcours — source de vérité unique des 8 étapes d'activation.
//
// Consommé à deux endroits qui doivent rester d'accord au caractère près :
//   - app/commencer/*      : le tunnel, qui fait franchir les étapes ;
//   - app/(app)/espace     : le dashboard, qui affiche l'état du Parcours.
// Toute divergence se verrait immédiatement (un tunnel « terminé » qui laisse le
// dashboard à 6/8), d'où le module partagé.
//
// Volontairement importable côté client (barre de progression, chapitres) : il
// ne contient aucune requête. Les signaux sont chargés par lib/journey-signals.

import type { VerticalKind } from "@/lib/verticals";

export type JourneyStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type JourneyChapterId = 1 | 2 | 3;

// Les signaux sont tous dérivés de la base, sauf `manualSteps` : les étapes 7 et
// 8 (« comprendre ses chiffres », « partager son lien ») n'ont aucune trace
// exploitable en base, elles sont validées à la main dans
// pages.journey_completed_steps.
export type JourneySignals = {
  hasPage: boolean;
  voiceCompletion: number;
  productCount: number;
  offerCount: number;
  openScheduleCount: number;
  generationCount: number;
  upcomingBookings: number;
  manualSteps: number[];
  verticalKind: VerticalKind;
};

export type JourneyChapter = {
  id: JourneyChapterId;
  title: string;
  // Écran-charnière joué avant le chapitre : l'enjeu concret, pas la mécanique.
  whyTitle: string;
  whyBody: string;
  // Écran de célébration joué après le chapitre.
  doneTitle: string;
  doneBody: string;
};

export const JOURNEY_CHAPTERS: Record<JourneyChapterId, JourneyChapter> = {
  1: {
    id: 1,
    title: "Ton adresse",
    whyTitle: "Aujourd'hui, tes clients te cherchent et ne te trouvent pas.",
    whyBody:
      "Un client sur deux qui ne trouve pas d'adresse claire appelle le concurrent d'à côté. On va te donner un lien à toi, que tu gardes à vie, et que Google peut enfin lire.",
    doneTitle: "Ton adresse existe.",
    doneBody:
      "Elle est à toi. Plus personne ne peut te la reprendre — et l'IA sait maintenant écrire avec tes mots.",
  },
  2: {
    id: 2,
    title: "Ce que tu vends",
    whyTitle: "Une vitrine vide ne vend rien.",
    whyBody:
      "Un visiteur décide en 8 secondes. S'il ne voit ni prix, ni offre, ni créneau, il repart. On va remplir ta vitrine maintenant — pas « plus tard ».",
    doneTitle: "Tes clients savent quoi acheter.",
    doneBody:
      "Un catalogue, une offre mise en avant, et de vrais créneaux. Ta vitrine peut encaisser une demande pendant que tu travailles.",
  },
  3: {
    id: 3,
    title: "Ta visibilité",
    whyTitle: "La plus belle vitrine du monde ne sert à rien si personne n'y passe.",
    whyBody:
      "C'est l'étape que tout le monde saute — et c'est exactement celle qui remplit un agenda. On va créer ton premier contenu et faire circuler ton lien.",
    doneTitle: "Ton parcours est terminé.",
    doneBody:
      "Ton commerce est en ligne, rempli et partageable. Tout ce que tu ajoutes à partir de maintenant ne fait que creuser l'écart.",
  },
};

export type JourneyStepDef = {
  n: JourneyStepId;
  title: string;
  chapter: JourneyChapterId;
  // Le gain concret, affiché sur l'étape. Formulé en bénéfice, pas en feature.
  gain: string;
  appliesTo: (kind: VerticalKind) => boolean;
  isDone: (signals: JourneySignals) => boolean;
};

// Les titres reprennent à l'identique ceux du dashboard : ils sont déjà connus
// des utilisateurs et servent d'ancres (#etape-n).
export const JOURNEY_STEPS: JourneyStepDef[] = [
  {
    n: 1,
    title: "Crée ta vitrine",
    chapter: 1,
    gain: "Une adresse à toi, lisible par Google, prête en 30 secondes.",
    appliesTo: () => true,
    isDone: (s) => s.hasPage,
  },
  {
    n: 2,
    title: "Apprends-lui à parler comme toi",
    chapter: 1,
    gain: "L'IA arrête d'écrire comme un robot et commence à écrire comme toi.",
    appliesTo: () => true,
    isDone: (s) => s.voiceCompletion >= 70,
  },
  {
    n: 3,
    title: "Crée ton produit",
    chapter: 2,
    gain: "Sans prix affiché, un visiteur sur deux repart sans te contacter.",
    appliesTo: () => true,
    isDone: (s) => s.productCount > 0,
  },
  {
    n: 4,
    title: "Crée tes offres",
    chapter: 2,
    gain: "L'offre mise en avant est le premier truc que voit un client. C'est elle qui déclenche.",
    appliesTo: () => true,
    isDone: (s) => s.offerCount > 0,
  },
  {
    n: 5,
    title: "Crée ton agenda",
    chapter: 2,
    gain: "Tes clients réservent la nuit, le dimanche, pendant que tu bosses.",
    // Réservé aux métiers de service : une boutique pure n'a pas de créneaux à
    // proposer. L'étape sort alors complètement du Parcours (total 7, pas 8).
    appliesTo: (kind) => kind !== "product",
    isDone: (s) => s.openScheduleCount > 0,
  },
  {
    n: 6,
    title: "Crée ton premier contenu",
    chapter: 3,
    gain: "Un post régulier, c'est ce qui fait revenir les gens sur ta vitrine.",
    appliesTo: () => true,
    isDone: (s) => s.generationCount > 0,
  },
  {
    n: 7,
    title: "Regarde tes résultats",
    chapter: 3,
    gain: "Ce que tu ne mesures pas, tu ne peux pas l'améliorer.",
    appliesTo: () => true,
    isDone: (s) => s.upcomingBookings > 0 || s.manualSteps.includes(7),
  },
  {
    n: 8,
    title: "Partage ton business partout",
    chapter: 3,
    gain: "Plus ton lien circule, plus ton agenda se remplit tout seul.",
    appliesTo: () => true,
    isDone: (s) => s.manualSteps.includes(8),
  },
];

export type JourneyStepState = {
  n: JourneyStepId;
  title: string;
  chapter: JourneyChapterId;
  gain: string;
  done: boolean;
};

export type JourneyState = {
  steps: JourneyStepState[];
  completedCount: number;
  total: number;
  nextStep: JourneyStepState | null;
  isComplete: boolean;
};

// Filtre les étapes hors périmètre AVANT de compter : createPage insère des
// horaires par défaut, donc une boutique pure aurait l'étape agenda « faite »
// gratuitement et afficherait 8/8 sans rien avoir fait.
export function journeyState(signals: JourneySignals): JourneyState {
  const steps = JOURNEY_STEPS.filter((step) =>
    step.appliesTo(signals.verticalKind)
  ).map((step) => ({
    n: step.n,
    title: step.title,
    chapter: step.chapter,
    gain: step.gain,
    done: step.isDone(signals),
  }));

  const completedCount = steps.filter((step) => step.done).length;
  return {
    steps,
    completedCount,
    total: steps.length,
    nextStep: steps.find((step) => !step.done) ?? null,
    isComplete: completedCount === steps.length,
  };
}
