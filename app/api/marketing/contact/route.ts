import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/emails/send";
import { escapeHtml } from "@/lib/emails/layout";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CONTACT_INBOX = process.env.CONTACT_EMAIL || "contact@wayne-web.com";

// Formulaire "Contacte-nous" de la page d'accueil marketing (bloc 08).
// Le message est stocké en base (source de vérité), puis notifié par
// email à l'équipe — l'échec d'envoi ne fait pas échouer la demande.
export async function POST(request: Request) {
  if (!rateLimit(`marketing-contact:${clientIp(request)}`, 3, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
  const message = String(body.message ?? "").trim().slice(0, 2000);
  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("marketing_messages")
    .insert({ name, email, message });
  if (error) {
    console.error("marketing-contact: insert failed", { error });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  await sendEmail({
    to: CONTACT_INBOX,
    subject: `Nouveau message de ${name} — page d'accueil Flux`,
    replyTo: email,
    html: `
      <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
      <p><strong>Email :</strong> ${escapeHtml(email)}</p>
      <p><strong>Message :</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
    `,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
