"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendFriendInvite } from "@/lib/emails/account-emails";

type ActionState = { error?: string; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null, max: number): string | null {
  const text = String(value ?? "").trim().slice(0, max);
  return text || null;
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ta session a expiré." };

  const name = clean(formData.get("name"), 80);
  if (!name) return { error: "Indique au moins ton nom." };

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

  if (error) return { error: "Impossible d’enregistrer le profil." };
  revalidatePath("/compte");
  return { message: "Profil enregistré." };
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
  if (!user?.email) return { error: "Ta session a expiré." };

  if (!rateLimit(`account-password-reset:${user.id}`, 3, 3_600_000)) {
    return {
      message:
        "Un email a déjà été envoyé. Vérifie ta boîte de réception et tes spams.",
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reinitialiser-mot-de-passe`,
  });
  if (error) return { error: "Impossible d’envoyer l’email pour le moment." };

  return {
    message:
      "Email envoyé à ton adresse actuelle. Le lien est temporaire et à usage unique.",
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
  if (!EMAIL_RE.test(email)) return { error: "Adresse email invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ta session a expiré." };
  if (user.email?.toLowerCase() === email.toLowerCase())
    return { error: "C’est déjà ton adresse actuelle." };

  if (!rateLimit(`account-email-change:${user.id}`, 3, 3_600_000)) {
    return {
      message:
        "Une demande est déjà en cours. Vérifie tes deux boîtes de réception.",
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
  if (error) return { error: "Impossible de lancer le changement d’email." };

  return {
    message:
      "Demande envoyée. Ton adresse ne changera qu’après confirmation depuis ton adresse actuelle et la nouvelle.",
  };
}

// Envoie une invitation stylisée à un ami (partage simple, sans suivi).
export async function inviteFriend(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) return { error: "Adresse email invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ta session a expiré." };

  const fromName = String(user.user_metadata?.name ?? "").trim() || "Un ami";
  after(() =>
    sendFriendInvite(email, fromName).catch((e) =>
      console.error("account: invite email failed", e)
    )
  );
  return { message: `Invitation envoyée à ${email}.` };
}

export async function deleteAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (String(formData.get("confirmation") ?? "").trim() !== "SUPPRIMER") {
    return { error: "Écris SUPPRIMER pour confirmer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ta session a expiré." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "La suppression a échoué. Réessaie plus tard." };

  redirect("/login");
}
