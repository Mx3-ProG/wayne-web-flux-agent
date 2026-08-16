import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { buildAgentContext } from "@/lib/intelligence/context/build-agent-context";
import { runAgentTurn, type ConversationMessage } from "@/lib/intelligence/providers/ai/anthropic";

// Simulateur texte de FLUX Voice : permet de tester le contexte, les tools et
// les permissions d'un tenant sans passer un vrai appel. Réservé au
// professionnel propriétaire du tenant testé (jamais un endpoint public) —
// il fait tourner exactement le même moteur que la téléphonie réelle.
const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(20)
    .default([]),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "dev_only" }, { status: 403 });
  }
  if (!(await rateLimit(`voice-sim:${clientIp(request)}`, 20, 60_000))) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) return NextResponse.json({ error: "no_active_page" }, { status: 404 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const built = await buildAgentContext(pageId, { callerPhone: "+33600000000" });
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.error === "disabled" ? 409 : 404 });
  }

  const history: ConversationMessage[] = [...body.history, { role: "user", content: body.message }];
  const result = await runAgentTurn(built.context, history);

  return NextResponse.json({
    reply: result.reply,
    toolCalls: result.toolCalls,
    context: built.context,
  });
}
