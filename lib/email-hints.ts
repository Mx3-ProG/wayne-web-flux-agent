// Les emails transactionnels atterrissent régulièrement dans les spams : domaine
// d'envoi récent, lien unique, expéditeur noreply. L'utilisateur qui l'ignore
// conclut que la fonctionnalité est cassée et abandonne — alors que l'email est
// bien parti. On le prévient donc systématiquement, à chaque confirmation d'envoi.
//
// Deux formulations : l'email part vers l'utilisateur lui-même, ou vers un tiers
// (invitation) — auquel cas lui dire de vérifier SES spams n'aurait aucun sens.

export const SPAM_HINT_SELF = "Si tu ne le vois pas, pense à vérifier tes spams.";

export const SPAM_HINT_OTHER =
  "L’email peut atterrir dans les spams : préviens la personne.";

// Concatène un message de confirmation avec l'avertissement adéquat.
export function withSpamHint(
  message: string,
  target: "self" | "other" = "self"
): string {
  const hint = target === "self" ? SPAM_HINT_SELF : SPAM_HINT_OTHER;
  return `${message} ${hint}`;
}
