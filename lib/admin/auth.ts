import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminMembership, AdminPermission } from "@/lib/types";

export type AdminContext = {
  userId: string;
  email: string;
  membership: AdminMembership;
  mfaVerified: boolean;
};

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("admin_memberships")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "pending"])
    .maybeSingle<AdminMembership>();
  if (!membership) return null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    userId: user.id,
    email: user.email ?? "",
    membership,
    mfaVerified: aal?.currentLevel === "aal2",
  };
}

export async function requireAdmin(
  permission?: AdminPermission,
  options: { requireMfa?: boolean; superadmin?: boolean } = {}
): Promise<AdminContext> {
  const context = await getAdminContext();
  if (!context) notFound();
  if (options.requireMfa !== false && !context.mfaVerified) notFound();
  if (options.superadmin && context.membership.role !== "superadmin") notFound();
  if (
    permission &&
    context.membership.role !== "superadmin" &&
    !context.membership.permissions.includes(permission)
  ) {
    notFound();
  }
  return context;
}

export function can(
  membership: AdminMembership,
  permission: AdminPermission
): boolean {
  return membership.role === "superadmin" || membership.permissions.includes(permission);
}

