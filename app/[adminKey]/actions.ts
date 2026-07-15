"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAdminAudit } from "@/lib/admin/audit";

export async function activateAdminMembership() {
  const context = await getAdminContext();
  if (!context?.mfaVerified) throw new Error("MFA requise");
  if (context.membership.status === "active") return;

  const admin = createAdminClient();
  await admin
    .from("admin_memberships")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("user_id", context.userId);
  await admin
    .from("admin_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("user_id", context.userId)
    .eq("status", "pending");
  await writeAdminAudit({
    actorId: context.userId,
    action: "admin.activate",
    targetType: "admin_membership",
    targetId: context.userId,
  });
  revalidatePath("/", "layout");
}

