import { NextResponse } from "next/server";
import { verifiedTwilioParams, twilioTwiml } from "@/lib/voice/providers/telephony/twilio";
import { resolveTenantByPhoneNumber, startCall, appendTranscript } from "@/lib/voice/call-session";
import { buildAgentContext } from "@/lib/intelligence/context/build-agent-context";
import { logVoiceEvent } from "@/lib/voice/logging";

// Point d'entrée de tout appel : configuré comme webhook "A call comes in"
// sur le numéro Twilio du tenant. Résout le tenant depuis le numéro composé,
// jamais depuis une donnée fournie par l'appelant.
export async function POST(request: Request) {
  const params = await verifiedTwilioParams(request);
  if (!params) {
    logVoiceEvent({ error: "invalid_twilio_signature", tool: "webhooks/incoming" });
    return new NextResponse("invalid signature", { status: 403 });
  }

  const calledNumber = params.To ?? "";
  const callerNumber = params.From ?? "";
  const externalCallId = params.CallSid ?? "";

  const tenant = await resolveTenantByPhoneNumber(calledNumber);
  if (!tenant) {
    logVoiceEvent({ error: "unknown_number", tool: "webhooks/incoming" });
    return hangupResponse();
  }

  const built = await buildAgentContext(tenant.pageId, { callerPhone: callerNumber });
  if (!built.ok) {
    // Agent désactivé entre la résolution du numéro et maintenant, ou page
    // introuvable : on raccroche proprement plutôt que d'échouer bruyamment.
    logVoiceEvent({ pageId: tenant.pageId, error: `agent_${built.error}`, tool: "webhooks/incoming" });
    return hangupResponse();
  }

  const ctx = built.context;
  const callId = await startCall({ pageId: tenant.pageId, externalCallId, callerNumber, calledNumber });

  const greetingText = ctx.greeting || `Bonjour, ${ctx.businessName}, ${ctx.agentName} à votre écoute. Que puis-je faire pour vous ?`;
  await appendTranscript(callId, "agent", greetingText);
  logVoiceEvent({ callId, pageId: tenant.pageId, outcome: "call_started" });

  const gatherUrl = new URL(`/api/voice/webhooks/gather?call=${callId}`, request.url).toString();
  const twiml = twilioTwiml.response(
    twilioTwiml.gatherSpeech({
      actionUrl: gatherUrl,
      prompt: greetingText,
      language: ctx.language,
      voice: ctx.voice,
    })
  );

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

function hangupResponse(): NextResponse {
  return new NextResponse(twilioTwiml.response(twilioTwiml.hangup()), {
    headers: { "Content-Type": "text/xml" },
  });
}
