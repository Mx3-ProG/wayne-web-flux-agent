import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActivePage } from "@/lib/active-project";
import { anthropic, buildPrompt, GENERATION_MODEL } from "@/lib/claude";
import { getTool } from "@/lib/tools-config";
import { rateLimit } from "@/lib/rate-limit";
import { enforceKarlMada, KARLMADA_BLOCK_MESSAGE } from "@/lib/karlmada";
import { loadAccountAccess } from "@/lib/account-status";
import type { Service, VoiceProfile } from "@/lib/types";
import { recordAiUsage } from "@/lib/ai-usage";

export const maxDuration = 120;

// Génération IA : débit atomique des crédits, validation KarlMada de la sortie
// complète avant exposition au navigateur, puis sauvegarde dans le coffre-fort.
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

  // La fenêtre IA est distincte du droit de publier : on la contrôle avant
  // tout débit et sans modifier has_active_access côté SQL.
  const account = await loadAccountAccess(user.id);
  if (account.status === "suspended") {
    return NextResponse.json({ error: "account_suspended" }, { status: 403 });
  }
  if (!account.aiAllowed) {
    return NextResponse.json({ error: "ai_window_expired" }, { status: 402 });
  }

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
    if (spendError.message.includes("subscription_required")) {
      // Essai 7 jours expiré sans souscription : lecture seule.
      return NextResponse.json({ error: "subscription_required" }, { status: 402 });
    }
    if (spendError.message.includes("insufficient_credits")) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
    }
    return NextResponse.json({ error: "spend_failed" }, { status: 500 });
  }

  // KarlMada intervient après le débit : une tentative interdite consomme les
  // crédits de l'outil et n'est jamais remboursée.
  const moderation = await enforceKarlMada(inputs, {
    userId: user.id,
    pageId: page?.id,
    surface: `ai-tool:${tool.slug}`,
  });
  if (moderation.error) {
    return NextResponse.json({ error: "content_blocked", message: moderation.error }, { status: 422 });
  }

  const { system, user: userPrompt } = await buildPrompt({
    tool,
    inputs,
    page,
    services,
    voice,
  });

  const encoder = new TextEncoder();
  let fullText = "";
  const aiStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let usageRecorded = false;
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
          }
        }
        const finalMessage = await messageStream.finalMessage();
        const outputModeration = await enforceKarlMada(fullText, {
          userId: user.id,
          pageId: page?.id,
          surface: `ai-tool:${tool.slug}:output`,
        });
        if (outputModeration.error) {
          await recordAiUsage({
            userId: user.id,
            pageId: page?.id,
            model: GENERATION_MODEL,
            operation: `tool:${tool.slug}`,
            usage: finalMessage.usage,
            startedAt: aiStartedAt,
            outcome: "blocked",
          });
          usageRecorded = true;
          controller.enqueue(encoder.encode(KARLMADA_BLOCK_MESSAGE));
          controller.close();
          return;
        }

        // Coffre-fort : le résultat reste accessible pour toujours.
        const aiUsageEventId = await recordAiUsage({
          userId: user.id,
          pageId: page?.id,
          model: GENERATION_MODEL,
          operation: `tool:${tool.slug}`,
          usage: finalMessage.usage,
          startedAt: aiStartedAt,
          outcome: "success",
        });
        usageRecorded = true;
        // Le résultat est déjà produit et facturé : sa sauvegarde au coffre-fort
        // est best-effort et ne doit jamais transformer un succès en erreur (ni
        // en remboursement via le catch ci-dessous).
        try {
          await admin.from("generations").insert({
            user_id: user.id,
            page_id: page?.id ?? null,
            tool_slug: tool.slug,
            inputs,
            output: fullText,
            credits_spent: tool.cost,
            ai_usage_event_id: aiUsageEventId,
          });
        } catch {
          // trace non bloquante
        }
        controller.enqueue(encoder.encode(fullText));
        controller.close();
      } catch (err) {
        if (!usageRecorded) {
          await recordAiUsage({
            userId: user.id,
            pageId: page?.id,
            model: GENERATION_MODEL,
            operation: `tool:${tool.slug}`,
            startedAt: aiStartedAt,
            outcome: "error",
            errorCode: "stream_failed",
          });
        }
        if (!fullText) {
          // Rien d'utilisable n'a été produit : on rembourse.
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
