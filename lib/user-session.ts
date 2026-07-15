import "server-only";

import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const USER_SESSION_COOKIE = "flux_user_session";

export async function startUserSession(userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  cookieStore.set(USER_SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await Promise.all([
    admin.from("user_sessions").insert({
      id,
      user_id: userId,
      user_agent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null,
    }),
    admin.from("profiles").update({ last_login_at: now }).eq("user_id", userId),
    admin.from("activity_events").insert({ user_id: userId, kind: "auth.login", source: "auth" }),
  ]);
  return id;
}

export async function endUserSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const id = cookieStore.get(USER_SESSION_COOKIE)?.value;
  cookieStore.delete(USER_SESSION_COOKIE);
  if (!id) return;
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("user_sessions")
    .select("started_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const now = new Date();
  await Promise.all([
    admin.from("user_sessions").update({
      ended_at: now.toISOString(),
      explicit_logout: true,
      authenticated_seconds: session?.started_at
        ? Math.max(0, Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000))
        : 0,
    }).eq("id", id).eq("user_id", userId),
    admin.from("activity_events").insert({ user_id: userId, kind: "auth.logout", source: "auth" }),
  ]);
}

