import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "./send";
import { friendInvite, passwordChangedSecurity } from "./templates";

// Orchestration des emails de compte / sécurité, envoyés par le code via Resend.
// Toujours appelé hors du chemin critique (after()) : erreur loguée, jamais
// propagée à l'action métier.

// Boîte de contact FLUX : une réponse à un email de compte doit arriver chez
// nous, pas se perdre (l'adresse d'envoi noreply@ ne reçoit rien).
const replyTo = () => process.env.EMAIL_REPLY_TO || null;

export async function sendPasswordChangedEmail(
  to: string,
  firstName: string
): Promise<void> {
  if (!to) return;
  // Un email de confirmation suffit ; on borne pour éviter les rafales.
  if (!rateLimit(`pwd-changed:${to.toLowerCase()}`, 3, 3_600_000)) return;
  const tpl = passwordChangedSecurity({ firstName: firstName || "" });
  await sendEmail({
    to,
    subject: tpl.subject,
    html: tpl.html,
    replyTo: replyTo(),
  });
}

export async function sendFriendInvite(
  toEmail: string,
  fromName: string
): Promise<void> {
  if (!toEmail) return;
  // Anti-abus : un même expéditeur ne peut pas spammer la même adresse.
  if (!rateLimit(`invite:${toEmail.toLowerCase()}`, 3, 86_400_000)) return;
  // Page d'accueil dédiée aux invités (pitch + CTA vers le tunnel) plutôt que
  // le tunnel brut : le destinataire ne connaît pas encore FLUX.
  const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/invitation`;
  const tpl = friendInvite({ fromName: fromName || "Un ami", signupUrl });
  await sendEmail({
    to: toEmail,
    subject: tpl.subject,
    html: tpl.html,
    replyTo: replyTo(),
  });
}
