import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type UsageShape = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  [key: string]: unknown;
};

export async function recordAiUsage(input: {
  userId?: string | null;
  pageId?: string | null;
  model: string;
  operation: string;
  usage?: unknown;
  startedAt: number;
  outcome: "success" | "blocked" | "error";
  errorCode?: string | null;
}): Promise<string | null> {
  try {
    const usage = (input.usage && typeof input.usage === "object"
      ? input.usage
      : {}) as UsageShape;
    const admin = createAdminClient();
    const { data, error } = await admin.from("ai_usage_events").insert({
      user_id: input.userId ?? null,
      page_id: input.pageId ?? null,
      model: input.model,
      operation: input.operation,
      input_tokens: Number(usage.input_tokens ?? 0),
      output_tokens: Number(usage.output_tokens ?? 0),
      cache_creation_tokens: Number(usage.cache_creation_input_tokens ?? 0),
      cache_read_tokens: Number(usage.cache_read_input_tokens ?? 0),
      latency_ms: Math.max(0, Date.now() - input.startedAt),
      outcome: input.outcome,
      error_code: input.errorCode ?? null,
      raw_usage: usage,
    }).select("id").single();
    if (error) return null;
    await admin.from("activity_events").insert({
      user_id: input.userId ?? null,
      page_id: input.pageId ?? null,
      kind: `ai.${input.outcome}`,
      source: "anthropic",
      metadata: { operation: input.operation, model: input.model },
    });
    return data.id as string;
  } catch {
    return null;
  }
}
