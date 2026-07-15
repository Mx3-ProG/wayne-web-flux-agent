"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPage } from "@/app/(app)/ma-page/actions";
import { saveVoiceProfile } from "@/app/(app)/contexte/actions";
import { saveSchedules } from "@/app/(app)/agenda/actions";
import { getActivePage } from "@/lib/active-project";
import { getVertical } from "@/lib/verticals";
import { enforceKarlMada } from "@/lib/karlmada";
import { sendEmailWithResult } from "@/lib/emails/send";
import { emailVerificationEmail } from "@/lib/emails/auth-templates";
import { createVerificationToken, verificationUrl } from "@/lib/email-verification";
import type { TimeRange, TunnelDraft } from "@/lib/types";

// Actions du tunnel /commencer.
//
// Un module "use server" ne peut PAS re-exporter (`export { createPage } from …`
// casse tout le module) ni exporter autre chose que des fonctions async. Les
// actions ci-dessous appellent donc les actions métier existantes plutôt que de
// les réexporter, et les constantes vivent dans lib/journey.ts.
//
// RÈGLE DE CRÉDITS — « le Parcours est offert » : les écritures faites ici sont
// gratuites, alors que les mêmes actions coûtent 15 cr. depuis le dashboard.
// C'est ce qui justifie les inserts directs plutôt que l'appel aux actions
// payantes. La gratuité est bornée par une garde « rien n'existe encore » côté
// serveur : sans elle, rejouer /commencer donnerait des offres gratuites à
// volonté.

export type TunnelActionState = { error?: string; message?: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---------------------------------------------------------------- compte

export async function createAccount(
  _prev: TunnelActionState,
  formData: FormData
): Promise<TunnelActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) return { error: "Remplis tous les champs." };
  if (password.length < 8)
    return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const admin = createAdminClient();
  // email_confirm: true est INDISPENSABLE ici : sans lui, signInWithPassword
  // échoue avec `email_not_confirmed` dès que le projet Supabase exige la
  // confirmation, et le tunnel se coupe en deux. La possession réelle de
  // l'adresse est prouvée séparément, par profiles.email_verified_at (00026).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name.slice(0, 40) },
  });

  if (error || !data.user) {
    if (error && /already|registered|exists/i.test(error.message)) {
      return { error: "Un compte existe déjà avec cet email." };
    }
    console.error("tunnel: createUser failed", error?.message);
    return { error: "Impossible de créer ton compte. Réessaie." };
  }

  // Client SSR (pas admin) : c'est lui qui pose les cookies de session.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    console.error("tunnel: sign-in after signup failed", signInError.message);
    return { error: "Compte créé, mais connexion impossible. Essaie de te connecter." };
  }

  // Vérification d'adresse en tâche de fond. Contrairement à l'ancien signUp, un
  // échec d'envoi ne supprime PAS le compte : l'utilisateur a déjà sa session et
  // son tunnel en cours. Le bandeau du dashboard permet de renvoyer l'email.
  const { token, hash } = createVerificationToken();
  await admin
    .from("profiles")
    .update({
      email_verify_token_hash: hash,
      email_verify_sent_at: new Date().toISOString(),
    })
    .eq("user_id", data.user.id);

  const mail = emailVerificationEmail(verificationUrl(token));
  const sent = await sendEmailWithResult({
    to: email,
    subject: mail.subject,
    html: mail.html,
  });
  if (!sent) {
    console.error("tunnel: verification email not sent", { userId: data.user.id });
  }

  revalidatePath("/", "layout");
  // Même URL : la page se re-rend en mode connecté et enchaîne sur le Parcours,
  // sans coupure « va voir tes emails ».
  redirect("/commencer");
}

// ------------------------------------------------------------- brouillon

// La verticale et les objectifs sont choisis AVANT que la vitrine existe : sans
// cette colonne, un refresh à l'écran 2 repartirait de zéro.
export async function saveTunnelDraft(
  patch: TunnelDraft,
  screen?: number
): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_draft")
    .eq("user_id", user.id)
    .maybeSingle<{ onboarding_draft: TunnelDraft | null }>();

  const merged: TunnelDraft = { ...(profile?.onboarding_draft ?? {}), ...patch };
  // Jamais bloquant : perdre un brouillon ne doit pas interrompre le tunnel.
  await supabase
    .from("profiles")
    .update({
      onboarding_draft: merged,
      ...(typeof screen === "number" ? { onboarding_step: screen } : {}),
    })
    .eq("user_id", user.id);
}

// ------------------------------------------------------------- étape 1-2

export async function tunnelCreatePage(input: {
  vertical: string;
  businessName: string;
  jobTitle: string;
  city: string;
}): Promise<{ error?: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  // Idempotence : revenir sur cet écran ne doit pas créer un second projet.
  const existing = await getActivePage(supabase, user.id);
  if (existing) return {};

  const result = await createPage(input);
  if (result.error) return { error: result.error };
  return {};
}

export async function tunnelSaveVoice(input: {
  tone: string;
  jobTitle: string;
  goals: string[];
}): Promise<{ error?: string }> {
  // 1re création gratuite côté saveVoiceProfile ; un repassage coûterait
  // CONTEXT_CHANGE_COST, d'où la garde ci-dessous.
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "Crée d'abord ta vitrine." };

  const { data: existing } = await supabase
    .from("voice_profiles")
    .select("page_id, tone")
    .eq("page_id", page.id)
    .maybeSingle<{ page_id: string; tone: string | null }>();
  // Déjà renseignée avec le même ton : rien à faire, et surtout rien à débiter.
  if (existing?.tone === input.tone) return {};

  return saveVoiceProfile({
    tone: input.tone,
    specialty: input.jobTitle,
    often_told: input.goals.join(","),
    address_form: "tu",
  });
}

// --------------------------------------------------------------- étape 3

export async function tunnelCreateCatalog(input: {
  categoryName: string;
  productName: string;
  priceCents: number;
  trackStock: boolean;
  stock: number;
}): Promise<{ error?: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "Crée d'abord ta vitrine." };

  // GARDE ANTI-ABUS : la gratuité ne vaut que pour un catalogue vierge. Un
  // second passage doit repasser par /produits, qui facture.
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("page_id", page.id);
  if ((count ?? 0) > 0) return {};

  // La modération ne se saute pas sous prétexte que c'est l'onboarding.
  const moderation = await enforceKarlMada(input, {
    userId: user.id,
    pageId: page.id,
    surface: "products:create",
  });
  if (moderation.error) return moderation;

  const categoryName = input.categoryName.trim().slice(0, 60);
  const productName = input.productName.trim().slice(0, 100);
  if (!categoryName || !productName) return { error: "Remplis les deux champs." };

  const { data: category, error: categoryError } = await supabase
    .from("product_categories")
    .insert({ page_id: page.id, name: categoryName, position: 0 })
    .select("id")
    .single();
  if (categoryError || !category) return { error: "Création impossible." };

  const { error: productError } = await supabase.from("products").insert({
    page_id: page.id,
    category_id: category.id,
    name: productName,
    description: "",
    price_cents: Math.max(0, Math.round(input.priceCents)),
    track_stock: input.trackStock,
    stock: input.trackStock ? Math.max(0, Math.floor(input.stock)) : 0,
    position: 0,
  });
  if (productError) return { error: "Création impossible." };

  revalidatePath("/produits");
  revalidatePath("/ma-page");
  return {};
}

// --------------------------------------------------------------- étape 4

export async function tunnelCreateOffer(input: {
  title: string;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
}): Promise<{ error?: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "Crée d'abord ta vitrine." };

  // Même garde que le catalogue : offre offerte une seule fois.
  const { count } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("page_id", page.id);
  if ((count ?? 0) > 0) return {};

  const moderation = await enforceKarlMada(input, {
    userId: user.id,
    pageId: page.id,
    surface: "offer:create",
  });
  if (moderation.error) return moderation;

  const title = input.title.trim().slice(0, 80);
  if (!title) return { error: "Donne un titre à ton offre." };

  const kind = getVertical(page.vertical).kind === "service" ? "service" : "produit";
  // draft_status "new" : comme toute création d'offre, elle apparaît sur la
  // vitrine à la prochaine publication.
  const { error } = await supabase.from("offers").insert({
    page_id: page.id,
    draft_status: "new",
    title,
    description: input.description.trim().slice(0, 300),
    kind,
    price_cents: Math.max(0, Math.round(input.priceCents)),
    compare_at_cents:
      input.compareAtCents == null
        ? null
        : Math.max(0, Math.round(input.compareAtCents)),
    image_url: null,
    active: true,
    position: 0,
  });
  if (error) return { error: "Création de l'offre impossible." };

  revalidatePath("/offres");
  revalidatePath("/ma-page");
  return {};
}

// --------------------------------------------------------------- étape 5

export async function tunnelSaveSchedules(input: {
  days: number[];
  openingTime: string;
  closingTime: string;
}): Promise<{ error?: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "Crée d'abord ta vitrine." };

  // L'agenda n'existe pas pour une boutique pure : l'écran est sauté côté
  // client, la garde empêche de l'atteindre autrement.
  if (getVertical(page.vertical).kind === "product") {
    return { error: "Ton activité n'utilise pas d'agenda." };
  }

  if (input.days.length === 0) return { error: "Choisis au moins un jour." };
  if (input.openingTime >= input.closingTime) {
    return { error: "L'heure de fermeture doit suivre l'ouverture." };
  }

  // saveSchedules valide déjà le format des heures et upsert sur
  // (page_id, weekday) : rejouer l'écran écrase proprement.
  return saveSchedules(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      open: input.days.includes(weekday),
      ranges: input.days.includes(weekday)
        ? ([[input.openingTime, input.closingTime]] as TimeRange[])
        : [],
    }))
  );
}

// ----------------------------------------------------------------- sortie

export async function finishTunnel(): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    // 99 = Parcours terminé : /espace cesse de renvoyer vers le tunnel.
    .update({ onboarding_step: 99, onboarding_draft: {} })
    .eq("user_id", user.id);

  revalidatePath("/espace");
  redirect("/espace?parcours=termine");
}
