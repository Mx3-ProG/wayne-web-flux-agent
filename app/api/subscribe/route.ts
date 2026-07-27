import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Inscription newsletter depuis la vitrine publique (bloc newsletter).
export async function POST(request: Request) {
  if (!await rateLimit(`subscribe:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !EMAIL_RE.test(email)) {
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

  // Upsert avec preuve de consentement horodatée. Une réinscription réactive un
  // abonné précédemment désinscrit (unsubscribed_at remis à null).
  const { error } = await supabase
    .from("page_subscribers")
    .upsert(
      { page_id: page.id, email, consented_at: new Date().toISOString(), unsubscribed_at: null },
      { onConflict: "page_id,email" }
    );
  if (error) {
    console.error("subscribe: insert failed", { slug, error });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  await supabase
    .from("page_events")
    .insert({ page_id: page.id, kind: "newsletter_signup" });

  return NextResponse.json({ ok: true }, { status: 201 });
}
