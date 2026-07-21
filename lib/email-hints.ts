// Les emails transactionnels atterrissent régulièrement dans les spams : domaine
// d'envoi récent, lien unique, expéditeur noreply. L'utilisateur qui l'ignore
// conclut que la fonctionnalité est cassée et abandonne — alors que l'email est
// bien parti. On le prévient donc systématiquement, à chaque confirmation d'envoi.
//
// Deux formulations : l'email part vers l'utilisateur lui-même, ou vers un tiers
// (invitation) — auquel cas lui dire de vérifier SES spams n'aurait aucun sens.

import "server-only";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export { webmail } from "@/lib/email-hints-constants";

// Concatène un message de confirmation avec l'avertissement adéquat, dans la
// langue du compte affiché (le message lui-même est déjà traduit par l'appelant).
export async function withSpamHint(
  message: string,
  target: "self" | "other" = "self",
  locale: Locale = defaultLocale
): Promise<string> {
  const t = await getDictionary(locale, "emails");
  const hint = target === "self" ? t.hints.spamSelf : t.hints.spamOther;
  return `${message} ${hint}`;
}
