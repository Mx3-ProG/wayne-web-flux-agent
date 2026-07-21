"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canResendVerification,
  createVerificationToken,
  verificationUrl,
} from "@/lib/email-verification";
import { sendEmailWithResult } from "@/lib/emails/send";
import { emailVerificationEmail } from "@/lib/emails/auth-templates";
import { defaultLocale, hasLocale } from "@/lib/i18n/config";

/**
 * Renvoie le lien de vérification d'adresse (bandeau du dashboard).
 * Régénère un jeton à chaque envoi : l'ancien lien cesse alors de fonctionner.
 */
export async function resendVerificationEmail(): Promise<{
  error?: string;
  message?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "not_authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_verified_at, email_verify_sent_at, locale")
    .eq("user_id", user.id)
    .maybeSingle<{
      email_verified_at: string | null;
      email_verify_sent_at: string | null;
      locale: string | null;
    }>();

  if (profile?.email_verified_at) return { message: "already_verified" };
  if (!canResendVerification(profile?.email_verify_sent_at ?? null)) {
    return { error: "rate_limited" };
  }

  const { token, hash } = createVerificationToken();
  // Client admin : email_verify_token_hash n'est pas exposé en écriture au user
  // par la RLS, et ne doit jamais l'être (il vaut un droit de publier).
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      email_verify_token_hash: hash,
      email_verify_sent_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (updateError) {
    console.error("verification: token update failed", updateError.message);
    return { error: "update_failed" };
  }

  const locale = profile?.locale && hasLocale(profile.locale) ? profile.locale : defaultLocale;
  const mail = await emailVerificationEmail(verificationUrl(token), locale);
  const sent = await sendEmailWithResult({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
  });
  if (!sent) return { error: "send_failed" };

  revalidatePath("/", "layout");
  return { message: "sent" };
}

/** Ferme la session de l'utilisateur sur cet appareil. */
export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw new Error("Impossible de se déconnecter pour le moment.");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

/** Persiste l'affichage du dialogue d'incitation sur tous les appareils. */
export async function markAccountUpsellShown(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ upsell_last_shown_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) throw new Error(`upsell_timestamp: ${error.message}`);
}
