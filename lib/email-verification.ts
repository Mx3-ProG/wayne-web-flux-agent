import "server-only";

import { createHash, randomBytes } from "node:crypto";

// Vérification d'adresse « maison ».
//
// Le tunnel /commencer ouvre la session immédiatement après la création du
// compte (admin.createUser + signInWithPassword), ce qui impose de poser
// email_confirm: true côté Supabase. auth.users.email_confirmed_at ne prouve
// donc plus rien : c'est profiles.email_verified_at, alimenté par ce jeton, qui
// atteste la possession réelle de l'adresse.
//
// Le jeton clair ne vit que dans l'email ; la base ne stocke que son sha256, si
// bien qu'une fuite de la table profiles ne permet pas de se vérifier soi-même.

// 32 octets d'entropie : la recherche se fait par égalité sur le hash indexé,
// donc aucune comparaison secret-à-secret à protéger contre le timing.
export function createVerificationToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashVerificationToken(token) };
}

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Anti-spam du bouton « renvoyer l'email ».
export const VERIFICATION_RESEND_COOLDOWN_MS = 60_000;

export function canResendVerification(sentAt: string | null): boolean {
  if (!sentAt) return true;
  return Date.now() - new Date(sentAt).getTime() >= VERIFICATION_RESEND_COOLDOWN_MS;
}

export function verificationUrl(token: string): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";
  return `${siteUrl}/auth/verifier?token=${encodeURIComponent(token)}`;
}
