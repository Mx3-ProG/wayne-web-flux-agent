import { Resend } from "resend";

// Envoi d'email transactionnel via Resend. Ne throw jamais : un échec
// d'email ne doit jamais faire échouer l'action métier appelante.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEV_FALLBACK_FROM = "FLUX <onboarding@resend.dev>";

// Neutralise l'injection d'en-têtes (CRLF) dans les champs contrôlés
// par l'utilisateur.
function cleanHeader(value: string): string {
  return value.replace(/[\r\n]/g, " ").trim();
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || DEV_FALLBACK_FROM;
}

// Domaine de l'expéditeur (« FLUX <no-reply@flux-wayne.com> » → flux-wayne.com).
// Utile au diagnostic : c'est CE domaine qui doit être vérifié dans Resend.
function fromDomain(from: string): string | null {
  const match = from.match(/@([^\s>]+)/);
  return match ? match[1].toLowerCase() : null;
}

// État de configuration email — sans secret. Sert au panneau de diagnostic
// admin pour voir en un coup d'œil ce qui manque en production.
export function emailConfigStatus(): {
  hasKey: boolean;
  from: string;
  fromDomain: string | null;
  isDevFallback: boolean;
  replyTo: string | null;
} {
  const from = fromAddress();
  return {
    hasKey: Boolean(process.env.RESEND_API_KEY),
    from,
    fromDomain: fromDomain(from),
    isDevFallback: !process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO || null,
  };
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

export type SendResult = { ok: boolean; error?: string };

// Livraison réelle : renvoie le détail de l'erreur Resend au lieu de l'avaler.
// Le message d'erreur de Resend est explicite (« The flux-wayne.com domain is
// not verified », « API key is invalid »…) : c'est exactement ce qu'il faut
// pour diagnostiquer un envoi qui échoue en production.
async function deliver(input: SendEmailInput): Promise<SendResult> {
  const client = getResend();
  if (!client) return { ok: false, error: "RESEND_API_KEY absente : aucun email n'est envoyé." };

  const to = cleanHeader(input.to);
  if (!EMAIL_RE.test(to)) return { ok: false, error: "Destinataire invalide." };
  const replyTo = input.replyTo ? cleanHeader(input.replyTo) : null;
  const from = fromAddress();

  try {
    const { error } = await client.emails.send({
      from,
      to,
      subject: cleanHeader(input.subject).slice(0, 200),
      html: input.html,
      ...(replyTo && EMAIL_RE.test(replyTo) ? { replyTo } : {}),
    });
    if (error) {
      // error : { name, message, statusCode } côté Resend.
      const detail = `${error.name ?? "resend_error"}: ${error.message ?? String(error)}`;
      console.error("email: send failed", { from, to, error: detail });
      return { ok: false, error: detail };
    }
    return { ok: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("email: send threw", { from, to, error: detail });
    return { ok: false, error: detail };
  }
}

export async function sendEmailWithResult(input: SendEmailInput): Promise<boolean> {
  if (!getResend()) {
    console.warn("email: RESEND_API_KEY absente, envoi ignoré", { subject: input.subject });
    return false;
  }
  const result = await deliver(input);
  return result.ok;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  await sendEmailWithResult(input);
}

// Envoi diagnostic (admin) : renvoie le détail de l'erreur pour affichage.
export async function sendEmailDiagnostic(input: SendEmailInput): Promise<SendResult> {
  return deliver(input);
}
