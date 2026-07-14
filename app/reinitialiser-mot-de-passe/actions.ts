"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPasswordChangedEmail } from "@/lib/emails/account-emails";

export type UpdatePasswordState = { error?: string };

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8)
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== confirm)
    return { error: "Les deux mots de passe ne correspondent pas." };

  const supabase = await createClient();
  // La session de récupération a été posée par /auth/confirm. Sans elle,
  // updateUser échoue : le lien a expiré ou la page a été ouverte hors flux.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { error: "Lien expiré. Refais une demande de réinitialisation." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Impossible de mettre à jour le mot de passe." };

  // Notification de sécurité à l'adresse du compte (anti-fraude).
  if (user.email) {
    const firstName = String(user.user_metadata?.name ?? "").trim();
    after(() =>
      sendPasswordChangedEmail(user.email!, firstName).catch((e) =>
        console.error("account: password-changed email failed", e)
      )
    );
  }

  revalidatePath("/", "layout");
  redirect("/espace");
}
