import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const safeId = z.string().min(1).max(100).regex(/^[a-z0-9:_-]+$/i);
const preferenceSchema = z.object({
  kind: z.literal("preference"),
  preference: z.object({
    enabled: z.boolean(),
    pausedUntil: z.string().datetime().nullable(),
    currentGoalId: safeId.nullable(),
  }),
});
const progressSchema = z.object({
  kind: z.literal("progress"),
  topicId: safeId,
  scopeKey: safeId.default("global"),
  status: z.enum(["active", "completed", "dismissed"]),
  prompted: z.boolean().optional(),
});
const eventSchema = z.object({
  kind: z.literal("event"),
  eventType: z.enum([
    "opened",
    "suggestion_shown",
    "suggestion_dismissed",
    "result_selected",
    "no_result",
    "paused",
    "disabled",
    "message_seen",
    "message_dismissed",
    "action_clicked",
    "step_completed",
  ]),
  surface: z.enum(["marketing", "onboarding", "app", "storefront"]),
  routeKey: z.string().max(160).optional(),
  intentId: safeId.optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  pageId: z.string().uuid().optional(),
});
const bodySchema = z.discriminatedUnion("kind", [
  preferenceSchema,
  progressSchema,
  eventSchema,
]);

export async function POST(request: Request) {
  if (!await rateLimit(`assistant:${clientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = parsed.data;

  if (body.kind === "preference") {
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { error } = await supabase.from("assistant_preferences").upsert({
      user_id: user.id,
      enabled: body.preference.enabled,
      paused_until: body.preference.pausedUntil,
      current_goal_id: body.preference.currentGoalId,
    });
    return error
      ? NextResponse.json({ error: "save_failed" }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  if (body.kind === "progress") {
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { error } = await supabase.rpc("record_assistant_topic", {
      p_scope_key: body.scopeKey,
      p_topic_id: body.topicId,
      p_status: body.status,
      p_prompted: body.prompted ?? false,
    });
    return error
      ? NextResponse.json({ error: "save_failed" }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("assistant_events").insert({
    user_id: user?.id ?? null,
    page_id: body.pageId ?? null,
    surface: body.surface,
    event_type: body.eventType,
    intent_id: body.intentId ?? null,
    route_key: body.routeKey ?? null,
    confidence_bucket: body.confidence ?? null,
  });
  return error
    ? NextResponse.json({ error: "save_failed" }, { status: 500 })
    : NextResponse.json({ ok: true });
}
