import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "./send";
import { friendInvite, passwordChangedSecurity } from "./templates";

// Orchestration des emails de compte / sécurité, envoyés par le code via Resend.
// Toujours appelé hors du chemin critique (after()) : erreur loguée, jamais
// propagée à l'action métier.

export async function sendPasswordChangedEmail(
  to: string,
  firstName: string
): Promise<void> {
  if (!to) return;
  // Un email de confirmation suffit ; on borne pour éviter les rafales.
  if (!rateLimit(`pwd-changed:${to.toLowerCase()}`, 3, 3_600_000)) return;
  const tpl = passwordChangedSecurity({ firstName: firstName || "" });
  await sendEmail({ to, subject: tpl.subject, html: tpl.html });
}

export async function sendFriendInvite(
  toEmail: string,
  fromName: string
): Promise<void> {
  if (!toEmail) return;
  // Anti-abus : un même expéditeur ne peut pas spammer la même adresse.
  if (!rateLimit(`invite:${toEmail.toLowerCase()}`, 3, 86_400_000)) return;
  const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/commencer`;
  const tpl = friendInvite({ fromName: fromName || "Un ami", signupUrl });
  await sendEmail({ to: toEmail, subject: tpl.subject, html: tpl.html });
}
