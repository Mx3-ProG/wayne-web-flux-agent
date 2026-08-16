import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Wrapper commun pour tout appel sortant d'un connecteur : throttle partagé
// (public.hit_rate_limit, 00046 — persistant en base, donc valable entre
// toutes les instances serverless) + retries avec backoff exponentiel.
// Un connecteur en échec répété ne doit jamais pouvoir mettre l'app à
// genoux ni spammer un fournisseur hors ligne.

export class RateLimitExceededError extends Error {
  constructor(bucket: string) {
    super(`rate_limit_exceeded:${bucket}`);
  }
}

export async function checkRateLimit(params: {
  provider: string;
  pageId: string;
  maxHits: number;
  windowMs: number;
}): Promise<void> {
  const admin = createAdminClient();
  const bucket = `integration:${params.provider}:${params.pageId}`;
  const { data, error } = await admin.rpc("hit_rate_limit", {
    p_bucket: bucket,
    p_max_hits: params.maxHits,
    p_window_ms: params.windowMs,
  });
  if (error) throw error;
  if (!data) throw new RateLimitExceededError(bucket);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter ? Number(retryAfter) * 1000 : baseDelayMs * 2 ** (attempt - 1);
        if (attempt < maxAttempts) {
          await sleep(delay);
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("fetch_failed");
}
