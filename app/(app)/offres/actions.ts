"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { offerLimit } from "@/lib/plans";
import type { OfferKind, Plan } from "@/lib/types";

async function ownedPageId(): Promise<{ pageId?: string; error?: string; userId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };
  // Le projet actif du user (multi-boutiques).
  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) return { error: "Crée d'abord ta vitrine." };
  return { pageId, userId: user.id };
}

// Crée une offre vide — refuse au-delà de la limite du forfait.
export async function createOffer(): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { pageId, userId, error } = await ownedPageId();
  if (error || !pageId || !userId) return { error };

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", userId).single(),
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("page_id", pageId),
  ]);
  const limit = offerLimit((profile?.plan as Plan) ?? "basique");
  if ((count ?? 0) >= limit) {
    return { error: "Limite d'offres atteinte pour ton forfait." };
  }

  // Créée en brouillon (`new`) : invisible sur la vitrine publique tant
  // qu'une version du site n'est pas publiée.
  const { data: offer, error: insertError } = await supabase
    .from("offers")
    .insert({
      page_id: pageId,
      title: "Nouvelle offre",
      position: count ?? 0,
      draft_status: "new",
    })
    .select("id")
    .single();
  if (insertError || !offer) return { error: "Création impossible." };

  revalidatePath("/offres");
  revalidatePath("/ma-page");
  return { id: offer.id };
}

type OfferFields = {
  title: string;
  description: string;
  kind: OfferKind;
  price_cents: number;
  compare_at_cents: number | null;
  image_url: string | null;
  active: boolean;
};

export async function createOfferFromTunnel(
  fields: OfferFields
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { pageId, userId, error } = await ownedPageId();
  if (error || !pageId || !userId) return { error };

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", userId).single(),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("page_id", pageId),
  ]);
  if ((count ?? 0) >= offerLimit((profile?.plan as Plan) ?? "basique")) {
    return { error: "Limite d'offres atteinte pour ton forfait." };
  }

  // Comme toute création : en brouillon (`new`), publiée avec la prochaine
  // version du site.
  const { error: insertError } = await supabase.from("offers").insert({
    page_id: pageId,
    draft_status: "new",
    title: fields.title.trim().slice(0, 80) || "Nouvelle offre",
    description: fields.description.trim().slice(0, 300),
    kind: fields.kind,
    price_cents: Math.max(0, Math.round(fields.price_cents)),
    compare_at_cents:
      fields.compare_at_cents == null
        ? null
        : Math.max(0, Math.round(fields.compare_at_cents)),
    image_url: fields.image_url,
    active: Boolean(fields.active),
    position: count ?? 0,
  });
  if (insertError) return { error: "Création de l'offre impossible." };

  revalidatePath("/offres");
  revalidatePath("/ma-page");
  return {};
}

export async function updateOffer(
  offerId: string,
  fields: Partial<OfferFields>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  // RLS "own offers" garantit que seule une offre du user est lisible/modifiable.
  const { data: offer } = await supabase
    .from("offers")
    .select("draft_status")
    .eq("id", offerId)
    .single();
  if (!offer) return { error: "Offre introuvable." };

  if (offer.draft_status === "new") {
    // Jamais publiée (invisible en public) : on écrit directement les colonnes.
    const { error } = await supabase.from("offers").update(fields).eq("id", offerId);
    if (error) return { error: "Enregistrement impossible." };
  } else {
    // Déjà publiée : les modifications vont dans le brouillon, appliquées à la
    // prochaine publication du site.
    const { error } = await supabase.rpc("merge_offer_draft", {
      oid: offerId,
      fields,
    });
    if (error) return { error: "Enregistrement impossible." };
  }
  revalidatePath("/offres");
  revalidatePath("/ma-page");
  return {};
}

export async function deleteOffer(offerId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("offers")
    .select("draft_status")
    .eq("id", offerId)
    .single();
  if (!offer) return { error: "Offre introuvable." };

  if (offer.draft_status === "new") {
    // Jamais publiée : suppression immédiate.
    const { error } = await supabase.from("offers").delete().eq("id", offerId);
    if (error) return { error: "Suppression impossible." };
  } else {
    // Publiée : reste visible en public jusqu'à la prochaine publication.
    const { error } = await supabase
      .from("offers")
      .update({ draft_status: "deleted" })
      .eq("id", offerId);
    if (error) return { error: "Suppression impossible." };
  }
  revalidatePath("/offres");
  revalidatePath("/ma-page");
  return {};
}

// Annule une suppression différée (draft_status = 'deleted').
export async function restoreOffer(offerId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("offers")
    .update({ draft_status: null })
    .eq("id", offerId)
    .eq("draft_status", "deleted");
  if (error) return { error: "Restauration impossible." };
  revalidatePath("/offres");
  revalidatePath("/ma-page");
  return {};
}
