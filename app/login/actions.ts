"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Identifiants incorrects. Réessaie." };

  revalidatePath("/", "layout");
  redirect("/espace");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || !password)
    return { error: "Remplis tous les champs." };
  if (password.length < 8)
    return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
    },
  });
  if (error) {
    if (error.message.includes("already registered"))
      return { error: "Un compte existe déjà avec cet email." };
    return { error: "Impossible de créer le compte. Réessaie." };
  }

  // Si la confirmation email est désactivée, une session existe déjà.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/espace");
  }
  return {
    message: "C'est presque bon : clique sur le lien reçu par email pour activer ton compte.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
