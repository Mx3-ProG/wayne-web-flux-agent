"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendFriendInvite } from "@/lib/emails/account-emails";
import { withSpamHint } from "@/lib/email-hints";
import { getAccountLocale, getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary, type AccountDict } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { SupabaseClient } from "@supabase/supabase-js";

// Pas encore d'utilisateur résolu (session expirée) : on retombe sur le
// cookie NEXT_LOCALE plutôt que sur le français, pour rester traduit même
// dans ce cas limite.
async function fallbackDict(): Promise<AccountDict> {
  return getDictionary(await getRequestLocale(), "account");
}

type ActionState = { error?: string; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null, max: number): string | null {
  const text = String(value ?? "").trim().slice(0, max);
  return text || null;
}

// Les server actions ne connaissent la locale que via le profil : ce helper la
// résout une fois, pour renvoyer error/message déjà traduits au client
// (useActionState affiche state.error/state.message tels quels).
async function accountDict(
  supabase: SupabaseClient,
  userId: string
): Promise<{ t: AccountDict; locale: Locale }> {
  const locale = await getAccountLocale(supabase, userId);
  return { t: await getDictionary(locale, "account"), locale };
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await fallbackDict()).errors.session_expired };
  const { t } = await accountDict(supabase, user.id);

  const name = clean(formData.get("name"), 80);
  if (!name) return { error: t.errors.name_required };

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      phone: clean(formData.get("phone"), 30),
      company_name: clean(formData.get("company_name"), 120),
      job_title: clean(formData.get("job_title"), 120),
      business_email: clean(formData.get("business_email"), 160),
      siret: clean(formData.get("siret"), 20),
      address: clean(formData.get("address"), 240),
    })
    .eq("user_id", user.id);

  if (error) return { error: t.errors.save_failed };
  revalidatePath("/compte");
  return { message: t.messages.profile_saved };
}

export async function requestAccountPasswordReset(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  void _prev;
  void _formData;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: (await fallbackDict()).errors.session_expired };
  const { t, locale } = await accountDict(supabase, user.id);

  if (!rateLimit(`account-password-reset:${user.id}`, 3, 3_600_000)) {
    return {
      message: await withSpamHint(t.messages.reset_email_sent, "self", locale),
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reinitialiser-mot-de-passe`,
  });
  if (error) return { error: t.errors.email_send_failed };

  return {
    message: await withSpamHint(t.messages.reset_email_sent_fresh, "self", locale),
  };
}

// Lance le changement d'adresse email. Supabase (secure email change) envoie un
// lien de confirmation à la NOUVELLE et à l'ANCIENNE adresse : cette double
// confirmation est la mesure anti-fraude. La validation finale passe par
// /auth/confirm (type email_change).
export async function changeEmail(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await fallbackDict()).errors.session_expired };
  const { t, locale } = await accountDict(supabase, user.id);

  if (!EMAIL_RE.test(email)) return { error: t.errors.invalid_email };
  if (user.email?.toLowerCase() === email.toLowerCase())
    return { error: t.errors.already_current_email };

  if (!rateLimit(`account-email-change:${user.id}`, 3, 3_600_000)) {
    return {
      message: t.messages.email_change_pending,
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";
  const { error } = await supabase.auth.updateUser(
    { email },
    {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/compte`,
    }
  );
  if (error) return { error: t.errors.email_change_failed };

  return {
    message: await withSpamHint(t.messages.email_change_requested, "self", locale),
  };
}

// Envoie une invitation stylisée à un ami (partage simple, sans suivi).
export async function inviteFriend(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await fallbackDict()).errors.session_expired };
  const { t, locale } = await accountDict(supabase, user.id);

  if (!EMAIL_RE.test(email)) return { error: t.errors.invalid_email };

  const fromName = String(user.user_metadata?.name ?? "").trim() || "Un ami";
  // Envoi AWAITé (et non after()) : sur Vercel, les callbacks after() ne sont
  // pas honorés ici et l'email ne partait jamais. sendFriendInvite ne throw
  // jamais (sendEmail capture tout), donc await est sans risque pour l'action.
  await sendFriendInvite(email, fromName, locale).catch((e) =>
    console.error("account: invite email failed", e)
  );
  return {
    message: await withSpamHint(t.messages.invite_sent.replace("{email}", email), "other", locale),
  };
}

export async function deleteAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await fallbackDict()).errors.session_expired };
  const { t } = await accountDict(supabase, user.id);

  if (String(formData.get("confirmation") ?? "").trim() !== t.danger.confirmWord) {
    return { error: t.errors.confirmation_mismatch };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: t.errors.deletion_failed };

  redirect("/login");
}
