"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { endUserSession, startUserSession } from "@/lib/user-session";

// La création de compte vit dans app/commencer/actions.ts (createAccount) : le
// tunnel ouvre la session puis écrit la configuration étape par étape. L'ancien
// couple signUp/initializeTunnel stockait tout dans user_metadata et ne le
// matérialisait qu'au premier signIn — un utilisateur arrivant par le lien
// email (/auth/confirm → /espace) se retrouvait donc avec un espace vide.
export type AuthState = { error?: string; message?: string };

const LOCAL_ADMIN_EMAIL = "mat75.deff@gmail.com";

async function provisionLocalAdmin(email: string, password: string) {
  if (
    process.env.NODE_ENV !== "development" ||
    email.toLowerCase() !== process.env.LOCAL_ADMIN_EMAIL?.toLowerCase() ||
    password !== process.env.LOCAL_ADMIN_PASSWORD
  ) {
    return;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;

  const existingUser = data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
  const attributes = {
    password,
    email_confirm: true,
    app_metadata: { role: "admin", local_only: true },
    user_metadata: { name: "Testeur", role: "admin" },
  };

  const result = existingUser
    ? await admin.auth.admin.updateUserById(existingUser.id, attributes)
    : await admin.auth.admin.createUser({ email, ...attributes });

  if (result.error) throw result.error;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  if (
    email.toLowerCase() === LOCAL_ADMIN_EMAIL &&
    process.env.NODE_ENV !== "development"
  ) {
    return { error: "Ce compte est disponible uniquement en local." };
  }

  try {
    await provisionLocalAdmin(email, password);
  } catch (error) {
    console.error("Impossible de provisionner le compte admin local.", error);
    return { error: "Impossible de préparer le compte admin local." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Identifiants incorrects. Réessaie." };

  if (data.user) await startUserSession(data.user.id);

  revalidatePath("/", "layout");
  redirect("/espace");
}

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await endUserSession(user.id);
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
