// Paliers de chiffre d'affaires (en centimes) — le compteur du dashboard monte
// vers le palier suivant pour donner un objectif motivant et une raison de
// revenir. Tout est calculé côté client à partir du CA cumulé.

export const REVENUE_MILESTONES = [
  10_000, // 100 €
  50_000, // 500 €
  100_000, // 1 000 €
  250_000, // 2 500 €
  500_000, // 5 000 €
  1_000_000, // 10 000 €
  2_500_000, // 25 000 €
  5_000_000, // 50 000 €
  10_000_000, // 100 000 €
];

export type RevenueProgress = {
  total: number; // CA cumulé (centimes)
  reached: number; // palier atteint le plus haut (centimes) ou 0
  next: number | null; // prochain palier (centimes) ou null si tout franchi
  previous: number; // base de la barre de progression (centimes)
  pct: number; // progression 0–100 vers le prochain palier
  remaining: number; // reste à faire avant le prochain palier (centimes)
};

export function revenueProgress(total: number): RevenueProgress {
  const safeTotal = Math.max(0, Math.round(total));
  const reached = [...REVENUE_MILESTONES]
    .filter((m) => safeTotal >= m)
    .pop() ?? 0;
  const next = REVENUE_MILESTONES.find((m) => m > safeTotal) ?? null;

  if (next === null) {
    return { total: safeTotal, reached, next, previous: reached, pct: 100, remaining: 0 };
  }
  const previous = reached; // 0 si aucun palier atteint
  const span = next - previous;
  const pct = span > 0 ? Math.min(100, Math.round(((safeTotal - previous) / span) * 100)) : 0;
  return { total: safeTotal, reached, next, previous, pct, remaining: next - safeTotal };
}
