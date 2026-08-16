import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConversationMessage, ToolCallLog } from "@/lib/intelligence/providers/ai/anthropic";

export type ResolvedTenant = { pageId: string };

// Résolution du tenant à l'appel entrant : sur `phone_number` (le numéro
// composé), pas `telephony_number_id` (identifiant interne au provider, utile
// seulement pour la configuration côté API, cf. migration 00051).
export async function resolveTenantByPhoneNumber(phoneNumber: string): Promise<ResolvedTenant | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("voice_agent_config")
    .select("page_id, enabled")
    .eq("phone_number", phoneNumber)
    .eq("telephony_provider", "twilio")
    .maybeSingle<{ page_id: string; enabled: boolean }>();
  if (!data || !data.enabled) return null;
  return { pageId: data.page_id };
}

// Idempotent : Twilio peut re-livrer le webhook d'appel entrant (retry réseau
// côté provider) — un même CallSid ne doit jamais créer deux lignes.
export async function startCall(input: {
  pageId: string;
  externalCallId: string;
  callerNumber: string;
  calledNumber: string;
}): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("voice_calls")
    .select("id")
    .eq("external_call_id", input.externalCallId)
    .maybeSingle<{ id: string }>();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("voice_calls")
    .insert({
      page_id: input.pageId,
      external_call_id: input.externalCallId,
      caller_number: input.callerNumber,
      called_number: input.calledNumber,
      status: "in_progress",
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) throw new Error("voice_call_insert_failed");
  return data.id;
}

export async function getCall(callId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("voice_calls")
    .select("id, page_id, caller_number, called_number, status")
    .eq("id", callId)
    .maybeSingle<{ id: string; page_id: string; caller_number: string; called_number: string; status: string }>();
  return data;
}

export async function findCallByExternalId(externalCallId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("voice_calls")
    .select("id, page_id, caller_number, called_number, status")
    .eq("external_call_id", externalCallId)
    .maybeSingle<{ id: string; page_id: string; caller_number: string; called_number: string; status: string }>();
  return data;
}

// Historique texte only (caller/agent) : c'est ce qui nourrit le prochain
// tour Claude. Les appels d'outils sont journalisés séparément (rôle "tool")
// pour l'observabilité, mais ne réintègrent pas l'historique conversationnel
// — runAgentTurn gère déjà ses propres tool_result à l'intérieur d'un tour.
export async function getConversationHistory(callId: string): Promise<ConversationMessage[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("voice_call_transcripts")
    .select("role, content")
    .eq("call_id", callId)
    .in("role", ["caller", "agent"])
    .order("at", { ascending: true });
  return (data ?? []).map((row) => ({
    role: row.role === "caller" ? "user" : "assistant",
    content: row.content,
  }));
}

export async function appendTranscript(
  callId: string,
  role: "caller" | "agent" | "tool" | "system",
  content: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("voice_call_transcripts").insert({ call_id: callId, role, content });
}

export async function recordToolCalls(callId: string, toolCalls: ToolCallLog[]): Promise<void> {
  if (toolCalls.length === 0) return;
  const supabase = createAdminClient();
  await supabase.from("voice_call_transcripts").insert(
    toolCalls.map((call) => ({
      call_id: callId,
      role: "tool" as const,
      content: JSON.stringify({ name: call.name, input: call.input, output: call.output }),
    }))
  );
}

export type CallOutcomePatch = Partial<{
  status: "in_progress" | "completed" | "failed" | "no_answer";
  outcome: "unknown" | "booked" | "rescheduled" | "cancelled" | "information_only" | "transferred" | "abandoned" | "error";
  appointmentId: string | null;
  transferredToHuman: boolean;
  customerId: string | null;
  endedAt: string;
  durationSeconds: number;
}>;

export async function updateCallOutcome(callId: string, patch: CallOutcomePatch): Promise<void> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.outcome !== undefined) row.outcome = patch.outcome;
  if (patch.appointmentId !== undefined) row.appointment_id = patch.appointmentId;
  if (patch.transferredToHuman !== undefined) row.transferred_to_human = patch.transferredToHuman;
  if (patch.customerId !== undefined) row.customer_id = patch.customerId;
  if (patch.endedAt !== undefined) row.ended_at = patch.endedAt;
  if (patch.durationSeconds !== undefined) row.duration_seconds = patch.durationSeconds;
  if (Object.keys(row).length === 0) return;
  await supabase.from("voice_calls").update(row).eq("id", callId);
}

// Appelé depuis le webhook de statut d'appel (fin d'appel côté Twilio,
// indépendant du flux conversationnel). Ne touche jamais un outcome déjà fixé
// par un tool (booked/cancelled/...) : ne complète que s'il est resté
// "unknown", en distinguant abandon pur (jamais parlé) d'un simple
// renseignement (échange sans action métier).
export async function finalizeCall(
  externalCallId: string,
  patch: { status: "completed" | "failed" | "no_answer"; durationSeconds?: number }
): Promise<void> {
  const supabase = createAdminClient();
  const { data: call } = await supabase
    .from("voice_calls")
    .select("id, outcome")
    .eq("external_call_id", externalCallId)
    .maybeSingle<{ id: string; outcome: string }>();
  if (!call) return;

  const { count } = await supabase
    .from("voice_call_transcripts")
    .select("id", { count: "exact", head: true })
    .eq("call_id", call.id)
    .eq("role", "caller");

  const row: Record<string, unknown> = { status: patch.status, ended_at: new Date().toISOString() };
  if (patch.durationSeconds !== undefined) row.duration_seconds = patch.durationSeconds;
  if (call.outcome === "unknown") {
    row.outcome = (count ?? 0) > 0 ? "information_only" : "abandoned";
  }
  await supabase.from("voice_calls").update(row).eq("id", call.id);
}

// Déduit l'outcome d'un tour à partir des tools effectivement exécutés avec
// succès — jamais du texte généré par le modèle, qui n'est pas une source de
// vérité métier.
export function outcomeFromToolCalls(toolCalls: ToolCallLog[]): CallOutcomePatch {
  for (const call of toolCalls) {
    const output = call.output as { ok?: boolean; bookingId?: string; transferTo?: string } | null;
    if (!output || typeof output !== "object") continue;
    if (call.name === "create_appointment" && output.ok && output.bookingId) {
      return { outcome: "booked", appointmentId: output.bookingId };
    }
    if (call.name === "reschedule_appointment" && output.ok && output.bookingId) {
      return { outcome: "rescheduled", appointmentId: output.bookingId };
    }
    if (call.name === "cancel_appointment" && output.ok) {
      return { outcome: "cancelled" };
    }
    if (call.name === "transfer_to_human" && output.ok) {
      return { outcome: "transferred", transferredToHuman: true };
    }
  }
  return {};
}
