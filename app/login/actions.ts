"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPage } from "@/app/(app)/ma-page/actions";
import { saveVoiceProfile } from "@/app/(app)/contexte/actions";
import { getActivePage } from "@/lib/active-project";
import { sendEmailWithResult } from "@/lib/emails/send";
import { confirmationEmail } from "@/lib/emails/auth-templates";

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
  const categoryName = String(metadata?.category_name ?? "").trim();
  const productName = String(metadata?.product_name ?? "").trim();
  const productPriceCents = Math.max(0, Number(metadata?.product_price_cents ?? 0));
  const trackStock = metadata?.track_stock === true;
  const productStock = Math.max(0, Math.floor(Number(metadata?.product_stock ?? 0)));
  const availableDays = Array.isArray(metadata?.available_days)
    ? metadata.available_days.map(Number).filter((day) => day >= 0 && day <= 6)
    : [];
  const openingTime = String(metadata?.opening_time ?? "09:00");
  const closingTime = String(metadata?.closing_time ?? "18:00");

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

      const page = await getActivePage(supabase, user.id);
      if (page) {
        if (categoryName && productName) {
          const { data: existingProduct } = await supabase
            .from("products")
            .select("id")
            .eq("page_id", page.id)
            .limit(1)
            .maybeSingle();

          if (!existingProduct) {
            const { data: category } = await supabase
              .from("product_categories")
              .insert({ page_id: page.id, name: categoryName, position: 0 })
              .select("id")
              .single();

            if (category) {
              await supabase.from("products").insert({
                page_id: page.id,
                category_id: category.id,
                name: productName,
                description: "",
                price_cents: productPriceCents,
                track_stock: trackStock,
                stock: trackStock ? productStock : 0,
                position: 0,
              });
            }
          }
        }

        if (
          availableDays.length > 0 &&
          /^\d{2}:\d{2}$/.test(openingTime) &&
          /^\d{2}:\d{2}$/.test(closingTime)
        ) {
          await supabase.from("schedules").upsert(
            [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
              page_id: page.id,
              weekday,
              open: availableDays.includes(weekday),
              ranges: availableDays.includes(weekday)
                ? [[openingTime, closingTime]]
                : [],
            }))
          );
        }
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
  const categoryName = String(formData.get("categoryName") ?? "").trim();
  const productName = String(formData.get("productName") ?? "").trim();
  const productPriceCents = Math.max(
    0,
    Math.round(Number(formData.get("productPrice") ?? 0) * 100)
  );
  const trackStock = formData.get("trackStock") === "true";
  const productStock = Math.max(
    0,
    Math.floor(Number(formData.get("productStock") ?? 0))
  );
  let availableDays: number[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("availableDays") ?? "[]"));
    if (Array.isArray(parsed)) {
      availableDays = parsed.map(Number).filter((day) => day >= 0 && day <= 6);
    }
  } catch {
    availableDays = [];
  }
  const openingTime = String(formData.get("openingTime") ?? "09:00");
  const closingTime = String(formData.get("closingTime") ?? "18:00");
  if (!name || !email || !password)
    return { error: "Remplis tous les champs." };
  if (password.length < 8)
    return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const metadata = {
    name,
    vertical,
    business_name: businessName,
    job_title: jobTitle,
    city,
    tone,
    goal,
    category_name: categoryName,
    product_name: productName,
    product_price_cents: productPriceCents,
    track_stock: trackStock,
    product_stock: productStock,
    available_days: availableDays,
    opening_time: openingTime,
    closing_time: closingTime,
  };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error("auth: NEXT_PUBLIC_SITE_URL absent");
    return { error: "Impossible de créer le compte. Réessaie plus tard." };
  }

  // Supabase limite son SMTP par défaut aux membres de l'équipe du projet.
  // generateLink conserve la vérification d'adresse, puis Resend livre l'email
  // à tous les utilisateurs via le domaine déjà configuré par l'application.
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: metadata, redirectTo: `${siteUrl}/login` },
  });
  if (error) {
    console.error("auth: signup link generation failed", {
      code: error.code,
      status: error.status,
    });
    if (/already|registered|exists/i.test(error.message))
      return { error: "Un compte existe déjà avec cet email." };
    return { error: "Impossible de créer le compte. Réessaie." };
  }

  const confirmation = confirmationEmail(data.properties.action_link);
  const sent = await sendEmailWithResult({
    to: email,
    subject: confirmation.subject,
    html: confirmation.html,
  });
  if (!sent) {
    // generateLink crée l'utilisateur avant l'envoi. On annule pour permettre
    // une nouvelle tentative avec la même adresse après un incident d'email.
    const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
    if (cleanupError) {
      console.error("auth: signup rollback failed", {
        userId: data.user.id,
        code: cleanupError.code,
      });
    }
    return {
      error:
        "Le compte n’a pas pu être confirmé par email. Vérifie l’adresse et réessaie.",
    };
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
