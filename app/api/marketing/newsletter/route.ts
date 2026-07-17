import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Inscription newsletter depuis la page d'accueil marketing (bloc 07).
export async function POST(request: Request) {
  if (!rateLimit(`marketing-newsletter:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("marketing_subscribers")
    .upsert(
      { email, source: "landing" },
      { onConflict: "email", ignoreDuplicates: true }
    );
  if (error) {
    console.error("marketing-newsletter: insert failed", { error });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
