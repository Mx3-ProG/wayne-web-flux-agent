import { NextResponse } from "next/server";
import { verifiedTwilioParams, twilioTwiml } from "@/lib/voice/providers/telephony/twilio";
import {
  getCall,
  getConversationHistory,
  appendTranscript,
  recordToolCalls,
  updateCallOutcome,
  outcomeFromToolCalls,
} from "@/lib/voice/call-session";
import { buildAgentContext } from "@/lib/intelligence/context/build-agent-context";
import { runAgentTurn } from "@/lib/intelligence/providers/ai/anthropic";
import { logVoiceEvent } from "@/lib/voice/logging";

const MAX_NO_INPUT_ATTEMPTS = 2;

// Un tour de conversation. Twilio rappelle cette URL à chaque résultat de
// reconnaissance vocale (<Gather input="speech">) ; l'état (historique,
// permissions, tenant) est entièrement reconstruit à chaque appel — aucune
// mémoire en process entre deux requêtes HTTP, seulement voice_calls /
// voice_call_transcripts.
export async function POST(request: Request) {
  const params = await verifiedTwilioParams(request);
  if (!params) {
    logVoiceEvent({ error: "invalid_twilio_signature", tool: "webhooks/gather" });
    return new NextResponse("invalid signature", { status: 403 });
  }

  const url = new URL(request.url);
  const callId = url.searchParams.get("call");
  const attempt = Number(url.searchParams.get("attempt") ?? "0");
  if (!callId) return hangupResponse();

  const call = await getCall(callId);
  if (!call) {
    logVoiceEvent({ error: "call_not_found", tool: "webhooks/gather" });
    return hangupResponse();
  }

  const built = await buildAgentContext(call.page_id, { callerPhone: call.caller_number });
  if (!built.ok) {
    logVoiceEvent({ callId, pageId: call.page_id, error: `agent_${built.error}`, tool: "webhooks/gather" });
    await appendTranscript(callId, "system", "agent_disabled_mid_call");
    return hangupResponse();
  }
  const ctx = built.context;

  const speech = params.SpeechResult?.trim();
  const gatherUrl = (nextAttempt: number) =>
    new URL(`/api/voice/webhooks/gather?call=${callId}&attempt=${nextAttempt}`, request.url).toString();

  if (!speech) {
    if (attempt >= MAX_NO_INPUT_ATTEMPTS) {
      const fallback = ctx.permissions.allowTransferToHuman && ctx.fallbackPhoneNumber;
      if (fallback) {
        await updateCallOutcome(callId, { outcome: "transferred", transferredToHuman: true });
        return new NextResponse(
          twilioTwiml.response(
            twilioTwiml.say("Je vous transfère vers un membre de l'équipe.", ctx.language, ctx.voice) +
              twilioTwiml.dial(ctx.fallbackPhoneNumber!)
          ),
          { headers: { "Content-Type": "text/xml" } }
        );
      }
      await updateCallOutcome(callId, { outcome: "abandoned" });
      return new NextResponse(
        twilioTwiml.response(
          twilioTwiml.say("Je n'ai pas compris, je vous prie de nous rappeler. Au revoir.", ctx.language, ctx.voice) +
            twilioTwiml.hangup()
        ),
        { headers: { "Content-Type": "text/xml" } }
      );
    }
    return new NextResponse(
      twilioTwiml.response(
        twilioTwiml.gatherSpeech({
          actionUrl: gatherUrl(attempt + 1),
          prompt: "Je n'ai pas entendu, pouvez-vous répéter ?",
          language: ctx.language,
          voice: ctx.voice,
        })
      ),
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  await appendTranscript(callId, "caller", speech);
  const history = await getConversationHistory(callId);

  const started = Date.now();
  const result = await runAgentTurn(ctx, history);
  logVoiceEvent({ callId, pageId: call.page_id, durationMs: Date.now() - started, outcome: "turn_completed" });

  await appendTranscript(callId, "agent", result.reply);
  await recordToolCalls(callId, result.toolCalls);

  const outcomePatch = outcomeFromToolCalls(result.toolCalls);
  if (Object.keys(outcomePatch).length > 0) {
    await updateCallOutcome(callId, outcomePatch);
  }

  if (outcomePatch.transferredToHuman && ctx.fallbackPhoneNumber) {
    return new NextResponse(
      twilioTwiml.response(
        twilioTwiml.say(result.reply, ctx.language, ctx.voice) + twilioTwiml.dial(ctx.fallbackPhoneNumber)
      ),
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  return new NextResponse(
    twilioTwiml.response(
      twilioTwiml.gatherSpeech({
        actionUrl: gatherUrl(0),
        prompt: result.reply,
        language: ctx.language,
        voice: ctx.voice,
      })
    ),
    { headers: { "Content-Type": "text/xml" } }
  );
}

function hangupResponse(): NextResponse {
  return new NextResponse(twilioTwiml.response(twilioTwiml.hangup()), {
    headers: { "Content-Type": "text/xml" },
  });
}
