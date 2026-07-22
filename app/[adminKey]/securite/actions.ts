"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAdminAudit } from "@/lib/admin/audit";
import { sendEmailDiagnostic } from "@/lib/emails/send";

export type EmailDiagnosticState = { error?: string; message?: string };

// Diagnostic email (admin sécurité) : envoie un vrai email de test via Resend et
// renvoie l'erreur EXACTE en cas d'échec (domaine non vérifié, clé invalide…).
// C'est le moyen de vérifier depuis la production si Resend est bien connecté,
// sans deviner dans les logs.
export async function runEmailDiagnostic(
  _state: EmailDiagnosticState,
  formData: FormData
): Promise<EmailDiagnosticState> {
  const context = await requireAdmin("security.read");
  const to = z.string().trim().toLowerCase().email().safeParse(formData.get("to"));
  if (!to.success) return { error: "Adresse de test invalide." };

  const result = await sendEmailDiagnostic({
    to: to.data,
    subject: "Test de configuration email — FLUX",
    html: "<p>Cet email confirme que Resend est correctement connecté à FLUX.</p><p>Si vous le recevez, l'envoi transactionnel fonctionne.</p>",
  });

  await writeAdminAudit({
    actorId: context.userId,
    action: "email.diagnostic",
    targetType: "email",
    targetId: to.data,
    after: { ok: result.ok, error: result.error ?? null },
  });

  return result.ok
    ? { message: `Email de test envoyé à ${to.data}. Vérifiez la boîte de réception (et les spams).` }
    : { error: `Échec Resend : ${result.error}` };
}
