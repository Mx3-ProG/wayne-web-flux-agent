"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPage } from "@/app/(app)/ma-page/actions";
import { saveVoiceProfile } from "@/app/(app)/contexte/actions";

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

async function initializeTunnel(
  metadata: Record<string, unknown> | undefined
) {
  const vertical = String(metadata?.vertical ?? "");
  const businessName = String(metadata?.business_name ?? "").trim();
  const jobTitle = String(metadata?.job_title ?? "").trim();
  const city = String(metadata?.city ?? "").trim();
  const tone = String(metadata?.tone ?? "").trim();
  const goal = String(metadata?.goal ?? "").trim();

  if (vertical && businessName) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Un user peut avoir plusieurs projets : on ne (re)crée la 1re vitrine
      // que s'il n'en a aucune.
      const { data: existingPages } = await supabase
        .from("pages")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (!existingPages || existingPages.length === 0) {
        await createPage({ vertical, businessName, jobTitle, city });
      }
    }
  }

  if (tone || goal) {
    await saveVoiceProfile({
      tone,
      specialty: jobTitle,
      often_told: goal,
      address_form: "tu",
    });
  }
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

  await initializeTunnel(data.user?.user_metadata);
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
  const vertical = String(formData.get("vertical") ?? "");
  const businessName = String(formData.get("businessName") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  if (!name || !email || !password)
    return { error: "Remplis tous les champs." };
  if (password.length < 8)
    return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        vertical,
        business_name: businessName,
        job_title: jobTitle,
        city,
        tone,
        goal,
      },
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
    await initializeTunnel(data.user?.user_metadata);
    revalidatePath("/", "layout");
    redirect("/espace");
  }
  return {
    message:
      "Ta configuration est prête. Clique sur le lien reçu par email pour activer ton espace.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
