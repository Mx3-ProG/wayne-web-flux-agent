import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cible du clic sur une notification push (claim_notification_deliveries renvoie
// action_url = /notifications/open/<id>). On marque la notification comme lue
// puis on redirige vers sa vraie destination métier (commande, réservation…).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = new URL(request.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const { data: notif } = await supabase
    .from("notifications")
    .select("action_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ action_url: string | null }>();

  if (notif) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  return NextResponse.redirect(new URL(notif?.action_url || "/notifications", origin));
}
