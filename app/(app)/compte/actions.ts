"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; message?: string };

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
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: "Impossible de mettre à jour le mot de passe." };
  return { message: "Mot de passe mis à jour." };
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
