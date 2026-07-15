import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_SESSION_COOKIE } from "@/lib/user-session";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { active?: boolean };
  const cookieValue = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${USER_SESSION_COOKIE}=`))
    ?.slice(USER_SESSION_COOKIE.length + 1);
  let sessionId = cookieValue && /^[0-9a-f-]{36}$/i.test(cookieValue)
    ? cookieValue
    : crypto.randomUUID();
  let shouldSetCookie = !cookieValue;
  const admin = createAdminClient();
  const { data: existingData } = await admin
    .from("user_sessions")
    .select("id, last_seen_at, ended_at, authenticated_seconds, active_seconds")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  const now = new Date();
  let existing = existingData;
  if (
    existing &&
    (existing.ended_at || now.getTime() - new Date(existing.last_seen_at).getTime() > 15 * 60 * 1000)
  ) {
    if (!existing.ended_at) {
      await admin.from("user_sessions").update({
        ended_at: new Date(new Date(existing.last_seen_at).getTime() + 15 * 60 * 1000).toISOString(),
      }).eq("id", existing.id);
    }
    sessionId = crypto.randomUUID();
    shouldSetCookie = true;
    existing = null;
  }
  if (existing) {
    const elapsed = Math.max(0, Math.min(90, Math.floor((now.getTime() - new Date(existing.last_seen_at).getTime()) / 1000)));
    await admin.from("user_sessions").update({
      last_seen_at: now.toISOString(),
      authenticated_seconds: Number(existing.authenticated_seconds) + elapsed,
      active_seconds: Number(existing.active_seconds) + (body.active ? elapsed : 0),
    }).eq("id", sessionId).eq("user_id", user.id);
  } else {
    await Promise.all([
      admin.from("user_sessions").insert({
        id: sessionId,
        user_id: user.id,
        user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      }),
      admin.from("profiles").update({ last_login_at: now.toISOString() }).eq("user_id", user.id),
      admin.from("activity_events").insert({ user_id: user.id, kind: "auth.session_started", source: "heartbeat" }),
    ]);
  }
  const response = NextResponse.json({ ok: true });
  if (shouldSetCookie) {
    response.cookies.set(USER_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
