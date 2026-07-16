"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { ADMIN_PERMISSIONS, adminBasePath } from "@/lib/admin/config";
import { writeAdminAudit } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailWithResult } from "@/lib/emails/send";
import { withSpamHint } from "@/lib/email-hints";
import type { AdminPermission, AdminRole } from "@/lib/types";

export type AdminActionState = { error?: string; message?: string };

const reasonSchema = z.string().trim().min(3).max(500);
const allowedPermissions = new Set(ADMIN_PERMISSIONS.map((item) => item.value));

function permissionsFrom(formData: FormData): AdminPermission[] {
  return formData
    .getAll("permissions")
    .map(String)
    .filter((value): value is AdminPermission => allowedPermissions.has(value as AdminPermission));
}

export async function adjustCredits(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireAdmin("credits.manage");
  const userId = z.string().uuid().safeParse(formData.get("userId"));
  const target = z.coerce.number().int().min(0).max(10_000_000).safeParse(formData.get("target"));
  const reason = reasonSchema.safeParse(formData.get("reason"));
  if (!userId.success || !target.success || !reason.success) {
    return { error: "Utilisateur, solde ou motif invalide." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_adjust_credit", {
    actor: context.userId,
    target_user: userId.data,
    target_balance: target.data,
    adjustment_reason: reason.data,
  });
  if (error) return { error: "L’ajustement n’a pas pu être enregistré." };
  revalidatePath(adminBasePath(), "layout");
  return { message: `Solde fixé à ${target.data} crédits.` };
}

export async function moderatePage(formData: FormData) {
  const context = await requireAdmin("sites.moderate");
  const pageId = z.string().uuid().safeParse(formData.get("pageId"));
  const status = z.enum(["unverified", "verified", "archived"]).safeParse(formData.get("status"));
  const rawReason = String(formData.get("reason") ?? "").trim();
  if (!pageId.success || !status.success) throw new Error("Action invalide");
  if (status.data === "archived" && !reasonSchema.safeParse(rawReason).success) {
    throw new Error("Un motif d’archivage est requis");
  }
  const admin = createAdminClient();
  const { data: pageBefore } = await admin
    .from("pages")
    .select("slug")
    .eq("id", pageId.data)
    .maybeSingle();
  const { error } = await admin.rpc("admin_moderate_page", {
    actor: context.userId,
    target_page: pageId.data,
    next_status: status.data,
    moderation_reason: rawReason || null,
  });
  if (error) throw new Error(error.message.includes("page_not_published") ? "La boutique doit être publiée." : "Modération impossible.");
  if (pageBefore?.slug) revalidatePath(`/p/${pageBefore.slug}`, "layout");
  revalidatePath(adminBasePath(), "layout");
}

export async function reviewGeneration(formData: FormData) {
  const context = await requireAdmin("flux.review");
  const generationId = z.string().uuid().safeParse(formData.get("generationId"));
  const status = z.enum(["approved", "rejected"]).safeParse(formData.get("status"));
  const score = z.coerce.number().int().min(1).max(5).safeParse(formData.get("score"));
  const note = z.string().trim().max(1000).safeParse(formData.get("note") ?? "");
  if (!generationId.success || !status.success || !score.success || !note.success) {
    throw new Error("Revue invalide");
  }
  const admin = createAdminClient();
  const { data: before } = await admin
    .from("generation_reviews")
    .select("*")
    .eq("generation_id", generationId.data)
    .maybeSingle();
  const next = {
    generation_id: generationId.data,
    status: status.data,
    score: score.data,
    note: note.data || null,
    reviewed_by: context.userId,
    reviewed_at: new Date().toISOString(),
  };
  const { error } = await admin.from("generation_reviews").upsert(next);
  if (error) throw new Error("Revue impossible");
  await writeAdminAudit({
    actorId: context.userId,
    action: `flux.${status.data}`,
    targetType: "generation",
    targetId: generationId.data,
    reason: note.data || null,
    before,
    after: next,
  });
  revalidatePath(`${adminBasePath()}/flux`);
}

export async function reviewKarlmada(formData: FormData) {
  const context = await requireAdmin("flux.review");
  const eventId = z.string().uuid().safeParse(formData.get("eventId"));
  const status = z.enum(["reviewed", "dismissed"]).safeParse(formData.get("status"));
  const note = z.string().trim().max(1000).safeParse(formData.get("note") ?? "");
  if (!eventId.success || !status.success || !note.success) throw new Error("Revue invalide");
  const admin = createAdminClient();
  const { error } = await admin
    .from("karlmada_events")
    .update({
      review_status: status.data,
      review_note: note.data || null,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", eventId.data);
  if (error) throw new Error("Revue impossible");
  await writeAdminAudit({
    actorId: context.userId,
    action: `karlmada.${status.data}`,
    targetType: "karlmada_event",
    targetId: eventId.data,
    reason: note.data || null,
  });
  revalidatePath(`${adminBasePath()}/flux`);
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match || data.users.length < 1000) return match ?? null;
  }
  return null;
}

export async function inviteAdmin(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const context = await requireAdmin(undefined, { superadmin: true });
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  const role = z.enum(["admin", "superadmin"]).safeParse(formData.get("role"));
  if (!email.success || !role.success) return { error: "Email ou rôle invalide." };
  const permissions = role.data === "superadmin" ? [] : permissionsFrom(formData);
  const admin = createAdminClient();
  let authUser = await findAuthUserByEmail(email.data);
  let actionLink: string | null = null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return { error: "NEXT_PUBLIC_SITE_URL est absent." };
  const confirmUrl = `${siteUrl}/auth/confirm?next=${encodeURIComponent(adminBasePath())}`;

  if (!authUser) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: email.data,
      options: { redirectTo: confirmUrl },
    });
    if (error || !data.user) return { error: "Impossible de créer l’invitation Supabase." };
    authUser = data.user;
    actionLink = data.properties.action_link;
  } else {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: email.data,
      options: { redirectTo: confirmUrl },
    });
    if (!error) actionLink = data.properties.action_link;
  }

  const membership = {
    user_id: authUser.id,
    role: role.data as AdminRole,
    permissions,
    status: "active",
    invited_by: context.userId,
    activated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: previousMembership } = await admin
    .from("admin_memberships")
    .select("role, status")
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (previousMembership?.role === "superadmin" && role.data !== "superadmin") {
    const { count } = await admin
      .from("admin_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "superadmin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) return { error: "Le dernier superadmin doit rester actif." };
  }
  const { error: membershipError } = await admin
    .from("admin_memberships")
    .upsert(membership, { onConflict: "user_id" });
  if (membershipError) return { error: "Impossible d’attribuer le rôle." };

  await admin.from("admin_invitations").insert({
    email: email.data,
    user_id: authUser.id,
    role: role.data,
    permissions,
    status: "pending",
    invited_by: context.userId,
  });

  const sent = actionLink
    ? await sendEmailWithResult({
        to: email.data,
        subject: "Invitation à l’administration FLUX",
        html: `<p>Vous êtes invité à rejoindre l’administration FLUX.</p><p><a href="${actionLink.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">Accepter l’invitation</a></p><p>La double authentification sera obligatoire à la première connexion.</p>`,
      })
    : false;
  await writeAdminAudit({
    actorId: context.userId,
    action: "admin.invite",
    targetType: "admin_membership",
    targetId: authUser.id,
    after: { email: email.data, role: role.data, permissions },
  });
  revalidatePath(`${adminBasePath()}/equipe`);
  return sent
    ? { message: withSpamHint("Invitation envoyée.", "other") }
    : { message: "Rôle créé, mais l’email n’a pas pu être envoyé." };
}

export async function updateAdminMembership(formData: FormData) {
  const context = await requireAdmin(undefined, { superadmin: true });
  const userId = z.string().uuid().safeParse(formData.get("userId"));
  const role = z.enum(["admin", "superadmin"]).safeParse(formData.get("role"));
  const status = z.enum(["active", "suspended"]).safeParse(formData.get("status"));
  if (!userId.success || !role.success || !status.success) throw new Error("Données invalides");
  const permissions = role.data === "superadmin" ? [] : permissionsFrom(formData);
  const admin = createAdminClient();
  const { data: before } = await admin
    .from("admin_memberships")
    .select("*")
    .eq("user_id", userId.data)
    .single();
  if (!before) throw new Error("Administrateur introuvable");

  if (before.role === "superadmin" && (role.data !== "superadmin" || status.data !== "active")) {
    const { count } = await admin
      .from("admin_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "superadmin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) throw new Error("Le dernier superadmin doit rester actif");
  }

  const after = { role: role.data, status: status.data, permissions, updated_at: new Date().toISOString() };
  const { error } = await admin.from("admin_memberships").update(after).eq("user_id", userId.data);
  if (error) throw new Error("Mise à jour impossible");
  await writeAdminAudit({
    actorId: context.userId,
    action: "admin.update",
    targetType: "admin_membership",
    targetId: userId.data,
    before,
    after,
  });
  revalidatePath(`${adminBasePath()}/equipe`);
}
