// Normalisation pour la dédup "exact match" — la seule automatisée sans
// confirmation dans ce MVP (cf. INTEGRATIONS_PLAN.md § 5 : fusion automatique
// sûre = email/téléphone normalisés identiques ; la fusion suggérée par
// nom+critère approximatif reste un suivi, pas implémentée ici pour éviter
// tout rapprochement hasardeux de deux clients différents).

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `+33${digits.slice(1)}`;
  return digits;
}

export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}
