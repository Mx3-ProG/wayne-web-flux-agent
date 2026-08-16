import { NextResponse } from "next/server";
import { verifiedTwilioParams } from "@/lib/voice/providers/telephony/twilio";
import { finalizeCall } from "@/lib/voice/call-session";
import { logVoiceEvent } from "@/lib/voice/logging";

// Statut de l'appel : configuré comme "Call Status Changes" webhook sur le
// numéro Twilio. On ne persiste que les statuts terminaux — les intermédiaires
// (ringing, in-progress, queued) n'apportent rien à voice_calls.
function mapTerminalStatus(callStatus: string | undefined): "completed" | "failed" | "no_answer" | null {
  switch (callStatus) {
    case "completed":
      return "completed";
    case "busy":
    case "failed":
    case "canceled":
      return "failed";
    case "no-answer":
      return "no_answer";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  const params = await verifiedTwilioParams(request);
  if (!params) {
    logVoiceEvent({ error: "invalid_twilio_signature", tool: "webhooks/status" });
    return new NextResponse("invalid signature", { status: 403 });
  }

  const externalCallId = params.CallSid;
  const status = mapTerminalStatus(params.CallStatus);
  if (!externalCallId || !status) return new NextResponse(null, { status: 204 });

  const durationSeconds = params.CallDuration ? Number(params.CallDuration) : undefined;
  await finalizeCall(externalCallId, { status, durationSeconds });
  logVoiceEvent({ outcome: `call_${status}`, tool: "webhooks/status" });

  return new NextResponse(null, { status: 204 });
}
