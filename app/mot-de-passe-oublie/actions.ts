"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export type ResetState = { error?: string; message?: string };

// Message neutre : on ne révèle jamais si un compte existe pour cet email.
const NEUTRAL =
  "Si un compte est associé à cet email, un lien de réinitialisation vient d’être envoyé.";

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Indique ton email." };

  // Limite les demandes par email pour éviter le harcèlement de boîte mail.
  if (!rateLimit(`reset:${email.toLowerCase()}`, 3, 3_600_000)) {
    return { message: NEUTRAL };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reinitialiser-mot-de-passe`,
  });

  return { message: NEUTRAL };
}
