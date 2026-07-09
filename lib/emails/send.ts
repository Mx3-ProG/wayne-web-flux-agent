import { Resend } from "resend";

// Envoi d'email transactionnel via Resend. Ne throw jamais : un échec
// d'email ne doit jamais faire échouer l'action métier appelante.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Neutralise l'injection d'en-têtes (CRLF) dans les champs contrôlés
// par l'utilisateur.
function cleanHeader(value: string): string {
  return value.replace(/[\r\n]/g, " ").trim();
}

let resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn("email: RESEND_API_KEY absent, envoi ignoré", {
      subject: input.subject,
    });
    return;
  }

  const to = cleanHeader(input.to);
  if (!EMAIL_RE.test(to)) {
    console.warn("email: destinataire invalide, envoi ignoré");
    return;
  }
  const replyTo = input.replyTo ? cleanHeader(input.replyTo) : null;

  // Sans domaine vérifié, Resend n'autorise que onboarding@resend.dev
  // (vers l'adresse du compte) : fallback pratique en dev.
  const from = process.env.EMAIL_FROM || "FLUX <onboarding@resend.dev>";

  try {
    const { error } = await client.emails.send({
      from,
      to,
      subject: cleanHeader(input.subject).slice(0, 200),
      html: input.html,
      ...(replyTo && EMAIL_RE.test(replyTo) ? { replyTo } : {}),
    });
    if (error) console.error("email: send failed", { error, to });
  } catch (e) {
    console.error("email: send threw", e);
  }
}
