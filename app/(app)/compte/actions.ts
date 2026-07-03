"use server";

import { createClient } from "@/lib/supabase/server";

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
