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

// Le texte (titres, gains, écrans-charnière) vit dans le dictionnaire i18n
// "journey" (lib/i18n/dictionaries/{locale}/journey.json), sous les mêmes
// identifiants numériques. Ce module ne garde que la structure invariante :
// numéros, chapitres et règles métier (appliesTo/isDone).
export type JourneyChapter = {
  id: JourneyChapterId;
};

export const JOURNEY_CHAPTERS: Record<JourneyChapterId, JourneyChapter> = {
  1: { id: 1 },
  2: { id: 2 },
  3: { id: 3 },
};

export type JourneyStepDef = {
  n: JourneyStepId;
  chapter: JourneyChapterId;
  appliesTo: (kind: VerticalKind) => boolean;
  isDone: (signals: JourneySignals) => boolean;
};

export const JOURNEY_STEPS: JourneyStepDef[] = [
  {
    n: 1,
    chapter: 1,
    appliesTo: () => true,
    isDone: (s) => s.hasPage,
  },
  {
    n: 2,
    chapter: 1,
    appliesTo: () => true,
    isDone: (s) => s.voiceCompletion >= 70,
  },
  {
    n: 3,
    chapter: 2,
    appliesTo: () => true,
    isDone: (s) => s.productCount > 0,
  },
  {
    n: 4,
    chapter: 2,
    appliesTo: () => true,
    isDone: (s) => s.offerCount > 0,
  },
  {
    n: 5,
    chapter: 2,
    // Réservé aux métiers de service : une boutique pure n'a pas de créneaux à
    // proposer. L'étape sort alors complètement du Parcours (total 7, pas 8).
    appliesTo: (kind) => kind !== "product",
    isDone: (s) => s.openScheduleCount > 0,
  },
  {
    n: 6,
    chapter: 3,
    appliesTo: () => true,
    isDone: (s) => s.generationCount > 0,
  },
  {
    n: 7,
    chapter: 3,
    appliesTo: () => true,
    isDone: (s) => s.upcomingBookings > 0 || s.manualSteps.includes(7),
  },
  {
    n: 8,
    chapter: 3,
    appliesTo: () => true,
    isDone: (s) => s.manualSteps.includes(8),
  },
];

export type JourneyStepState = {
  n: JourneyStepId;
  chapter: JourneyChapterId;
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
    chapter: step.chapter,
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
