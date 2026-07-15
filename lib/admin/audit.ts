import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

function truncateIp(value: string | null): string | null {
  if (!value) return null;
  const ip = value.split(",")[0]?.trim();
  if (!ip) return null;
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + "::/64";
  const parts = ip.split(".");
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : null;
}

export async function writeAdminAudit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const requestHeaders = await headers();
  const ip = truncateIp(
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip")
  );
  const admin = createAdminClient();
  await admin.from("admin_audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    reason: input.reason ?? null,
    before_data: input.before ?? null,
    after_data: input.after ?? null,
    ip_prefix: ip,
  });
}

