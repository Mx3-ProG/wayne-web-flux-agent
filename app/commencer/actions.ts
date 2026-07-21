"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPage,
  publishPage,
  savePageFields,
  type PublishError,
} from "@/app/(app)/ma-page/actions";
import { saveVoiceProfile } from "@/app/(app)/contexte/actions";
import { saveSchedules } from "@/app/(app)/agenda/actions";
import { getActivePage } from "@/lib/active-project";
import { getFont, getVertical } from "@/lib/verticals";
import { DESIGN_KIT_BY_ID } from "@/lib/vitrine-design/registry";
import { designKitPatch } from "@/lib/vitrine-design/resolver";
import { enforceKarlMada } from "@/lib/karlmada";
import { sendEmailWithResult } from "@/lib/emails/send";
import { emailVerificationEmail } from "@/lib/emails/auth-templates";
import { createVerificationToken, verificationUrl } from "@/lib/email-verification";
import { healMissingProfile } from "@/lib/profile-heal";
import type { PageDraftFields, TimeRange, TunnelDraft } from "@/lib/types";
import { cookies } from "next/headers";
import { hasLocale, localeHref, LOCALE_COOKIE } from "@/lib/i18n/config";

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

// Codes plutôt que texte : createAccount est un "use server" appelé par
// useActionState, sans accès à la locale du visiteur. Le composant client
// traduit le code via son dictionnaire (dict.errors).
export type CreateAccountErrorCode =
  | "fillAll"
  | "passwordTooShort"
  | "accountExists"
  | "createFailed"
  | "createdSignInFailed";
export type CreateAccountState = { error?: CreateAccountErrorCode };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---------------------------------------------------------------- compte

export async function createAccount(
  _prev: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedLocale = String(formData.get("locale") ?? "fr");
  const locale = hasLocale(requestedLocale) ? requestedLocale : "fr";

  if (!name || !email || !password) return { error: "fillAll" };
  if (password.length < 8) return { error: "passwordTooShort" };

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
      return { error: "accountExists" };
    }
    console.error("tunnel: createUser failed", error?.message);
    return { error: "createFailed" };
  }

  // Client SSR (pas admin) : c'est lui qui pose les cookies de session.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    console.error("tunnel: sign-in after signup failed", signInError.message);
    return { error: "createdSignInFailed" };
  }

  // Le choix effectué sur la planète, avant l'identification, devient la
  // langue gratuite et définitive du premier parcours. Sa persistance ne doit
  // PAS échouer en silence : un compte resté en 'fr' oblige ensuite à payer 25
  // crédits pour atteindre sa vraie langue (dashboard). Si la 1re tentative
  // échoue (profil pas encore matérialisé…), on répare la ligne et on rejoue.
  let localeError = (
    await supabase.rpc("set_initial_production_locale", { target_locale: locale })
  ).error;
  if (localeError) {
    await healMissingProfile(supabase, data.user);
    localeError = (
      await supabase.rpc("set_initial_production_locale", { target_locale: locale })
    ).error;
  }
  if (localeError) {
    console.error("tunnel: initial locale could not be persisted", localeError.message);
  } else {
    await supabase.from("profiles").update({ onboarding_step: 1 }).eq("user_id", data.user.id);
  }
  // Le cookie reflète toujours le choix explicite du visiteur : filet de
  // sécurité pour getAccountLocale si la ligne profil manque encore.
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
  });

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

  const mail = await emailVerificationEmail(verificationUrl(token), locale);
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
  redirect(localeHref(locale, "/commencer"));
}

// ------------------------------------------------------------- brouillon

export async function setInitialProductionLocale(locale: string): Promise<{ error?: string }> {
  if (!hasLocale(locale)) return { error: "invalid_locale" };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "notConnected" };
  const { error } = await supabase.rpc("set_initial_production_locale", { target_locale: locale });
  if (error) return { error: error.message.includes("locked") ? "initial_locale_locked" : "save_failed" };
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
  return {};
}

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
  if (!user) return { error: "notConnected" };

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
  if (!user) return { error: "notConnected" };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "createPageFirst" };

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
  if (!user) return { error: "notConnected" };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "createPageFirst" };

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
  if (!categoryName || !productName) return { error: "twoFieldsRequired" };

  const { data: category, error: categoryError } = await supabase
    .from("product_categories")
    .insert({ page_id: page.id, name: categoryName, position: 0 })
    .select("id")
    .single();
  if (categoryError || !category) return { error: "catalogCreateFailed" };

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
  if (productError) return { error: "catalogCreateFailed" };

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
  if (!user) return { error: "notConnected" };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "createPageFirst" };

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
  if (!title) return { error: "offerTitleRequired" };

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
  if (error) return { error: "offerCreateFailed" };

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
  if (!user) return { error: "notConnected" };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "createPageFirst" };

  // L'agenda n'existe pas pour une boutique pure : l'écran est sauté côté
  // client, la garde empêche de l'atteindre autrement.
  if (getVertical(page.vertical).kind === "product") {
    return { error: "noAgendaForVertical" };
  }

  if (input.days.length === 0) return { error: "chooseOneDay" };
  if (input.openingTime >= input.closingTime) {
    return { error: "closingAfterOpening" };
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

// --------------------------------------------------------------- style

// « Choisis ton style » : applique un kit de la bibliothèque de design à la
// vitrine. Passe par savePageFields (gratuite, c'est le chemin de l'éditeur) —
// le style atterrit donc dans le brouillon, comme les écritures des écrans
// précédents, et part en ligne à la première publication.
export async function tunnelSaveTheme(kitId: string): Promise<{ error?: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "notConnected" };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "createPageFirst" };

  // designKitPatch retombe silencieusement sur un kit par défaut si l'id est
  // inconnu : on refuse explicitement plutôt que d'appliquer autre chose que ce
  // que l'utilisateur a cliqué.
  if (!DESIGN_KIT_BY_ID.has(kitId)) return { error: "unknownStyle" };

  return savePageFields(page.id, designKitPatch(kitId, page));
}

// Écrans « images » et « détails », repris de l'assistant vitrine (/ma-page).
// L'assistant, lui, facture VITRINE_ASSIST_COST à la confirmation : ici on passe
// par savePageFields (gratuite), conformément à la règle « le Parcours est
// offert » du haut de ce fichier.
//
// L'entrée est une liste blanche explicite plutôt qu'un Partial<PageDraftFields>
// ouvert : cette action est appelée depuis le tunnel, elle n'a aucune raison de
// pouvoir écrire `sections`, `legal` ou `hide_branding`.
export async function tunnelSaveDesign(input: {
  logoUrl?: string | null;
  heroUrl?: string | null;
  font?: string;
  primary?: string;
  dark?: string;
  phone?: string;
  address?: string;
}): Promise<{ error?: string }> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "notConnected" };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "createPageFirst" };

  const fields: Partial<PageDraftFields> = {};
  if (input.logoUrl !== undefined) fields.logo_url = input.logoUrl || null;
  if (input.heroUrl !== undefined) fields.hero_url = input.heroUrl || null;
  if (input.font) fields.font = getFont(input.font).id;
  if (input.phone !== undefined) fields.phone = input.phone.trim().slice(0, 30);
  if (input.address !== undefined) fields.address = input.address.trim().slice(0, 120);
  // Les couleurs sont un jsonb complet : les fusionner avec celles déjà posées
  // par le kit, sinon choisir une couleur principale effacerait le reste.
  if (input.primary || input.dark) {
    fields.colors = {
      ...page.colors,
      ...(input.primary ? { primary: input.primary } : {}),
      ...(input.dark ? { dark: input.dark } : {}),
    };
  }

  if (Object.keys(fields).length === 0) return {};
  return savePageFields(page.id, fields);
}

// --------------------------------------------------------------- publication

// Publier depuis le tunnel. Le coût (PUBLISH_COST) et le verrou email vivent
// dans le RPC publish_page : cette action ne fait que résoudre le projet actif,
// elle ne rejoue aucune de ces règles.
export async function tunnelPublish(): Promise<{
  error?: PublishError;
  balance?: number;
}> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "unknown" };
  const page = await getActivePage(supabase, user.id);
  if (!page) return { error: "unknown" };

  return publishPage(page.id);
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
