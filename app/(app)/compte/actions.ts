"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  sendFriendInvite,
  sendPasswordChangedEmail,
} from "@/lib/emails/account-emails";

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

export async function changePassword(
  _prev: { error?: string; message?: string },
  formData: FormData
): Promise<{ error?: string; message?: string }> {
  const newPassword = String(formData.get("new_password") ?? "");
  if (newPassword.length < 8)
    return { error: "Le nouveau mot de passe doit faire au moins 8 caractères." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: "Impossible de mettre à jour le mot de passe." };

  // Notification de sécurité à l'adresse du compte (anti-fraude).
  if (user?.email) {
    const firstName = String(user.user_metadata?.name ?? "").trim();
    after(() =>
      sendPasswordChangedEmail(user.email!, firstName).catch((e) =>
        console.error("account: password-changed email failed", e)
      )
    );
  }
  return { message: "Mot de passe mis à jour." };
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

  const { error } = await supabase.auth.updateUser(
    { email },
    {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/compte`,
    }
  );
  if (error) return { error: "Impossible de lancer le changement d’email." };

  return {
    message:
      "Un lien de confirmation vient d’être envoyé à ta nouvelle adresse (et à l’ancienne). Clique dessus pour valider le changement.",
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
