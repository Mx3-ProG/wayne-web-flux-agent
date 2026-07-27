import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Enregistrement d'un appareil pour les notifications Web Push (table
// push_subscriptions, migration 00032). Cette table n'a AUCUNE policy RLS
// (endpoint + clés = secrets techniques) : on écrit via le client service-role
// APRÈS avoir authentifié l'utilisateur ici.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    deviceName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  // Upsert par endpoint (unique) : un même appareil qui re-souscrit est
  // réassigné au user courant et réactivé (disabled_at remis à null).
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      device_name: (body.deviceName || "Appareil").slice(0, 60),
      user_agent: (request.headers.get("user-agent") || "").slice(0, 300),
      last_seen_at: now,
      updated_at: now,
      disabled_at: null,
    },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Désabonnement : on désactive l'appareil (on garde l'historique de livraison).
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.endpoint) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const admin = createAdminClient();
  await admin
    .from("push_subscriptions")
    .update({ disabled_at: new Date().toISOString() })
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
