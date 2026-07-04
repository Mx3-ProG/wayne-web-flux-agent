import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActivePage } from "@/lib/active-project";
import { anthropic, buildPrompt, GENERATION_MODEL } from "@/lib/claude";
import { getTool } from "@/lib/tools-config";
import { rateLimit } from "@/lib/rate-limit";
import type { Service, VoiceProfile } from "@/lib/types";

export const maxDuration = 120;

// Génération IA : débit atomique des crédits (spend_credits), streaming du
// résultat, sauvegarde dans le coffre-fort. Remboursement si l'API échoue
// avant d'avoir produit quoi que ce soit.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`generate:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: { tool?: string; inputs?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const tool = getTool(String(body.tool ?? ""));
  if (!tool) return NextResponse.json({ error: "unknown_tool" }, { status: 400 });

  // Entrées : uniquement les champs déclarés par l'outil, longueur bornée.
  const inputs: Record<string, string> = {};
  for (const field of tool.fields) {
    const raw = body.inputs?.[field.id];
    if (typeof raw === "string" && raw.trim()) {
      inputs[field.id] = raw.trim().slice(0, 400);
    } else if (!field.optional && field.type === "select") {
      return NextResponse.json({ error: "missing_field" }, { status: 400 });
    }
  }

  // Contexte : vitrine (projet actif) + prestations + profil de voix (par projet)
  const page = await getActivePage(supabase, user.id);
  let voice: VoiceProfile | null = null;
  let services: Service[] = [];
  if (page) {
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase
        .from("voice_profiles")
        .select("*")
        .eq("page_id", page.id)
        .maybeSingle<VoiceProfile>(),
      supabase.from("services").select("*").eq("page_id", page.id).order("position"),
    ]);
    voice = v ?? null;
    services = (s ?? []) as Service[];
  }

  // Débit AVANT génération, dans une fonction SQL sous verrou.
  const admin = createAdminClient();
  const { error: spendError } = await admin.rpc("spend_credits", {
    uid: user.id,
    cost: tool.cost,
    why: `tool:${tool.slug}`,
  });
  if (spendError) {
    if (spendError.message.includes("insufficient_credits")) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
    }
    return NextResponse.json({ error: "spend_failed" }, { status: 500 });
  }

  const { system, user: userPrompt } = buildPrompt({
    tool,
    inputs,
    page,
    services,
    voice,
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = anthropic.messages.stream({
          model: GENERATION_MODEL,
          max_tokens: 2000,
          system,
          messages: [{ role: "user", content: userPrompt }],
        });
        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        // Coffre-fort : le résultat reste accessible pour toujours.
        await admin.from("generations").insert({
          user_id: user.id,
          page_id: page?.id ?? null,
          tool_slug: tool.slug,
          inputs,
          output: fullText,
          credits_spent: tool.cost,
        });
        controller.close();
      } catch (err) {
        if (!fullText) {
          // Rien n'a été produit : on rembourse.
          await admin.from("credit_ledger").insert({
            user_id: user.id,
            delta: tool.cost,
            reason: `refund:${tool.slug}`,
          });
        }
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
