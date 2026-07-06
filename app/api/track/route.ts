import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const KINDS = new Set(["view", "phone_click", "social_click", "whatsapp_click"]);

// Tracking anonyme de la vitrine publique (sendBeacon-friendly).
// `newsletter_signup` est enregistré côté /api/subscribe, pas ici.
export async function POST(request: Request) {
  if (!rateLimit(`track:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  const kind = String(body.kind ?? "");
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !KINDS.has(kind)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!page) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("page_events")
    .insert({ page_id: page.id, kind });
  if (error) {
    console.error("track: insert failed", { slug, kind, error });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
