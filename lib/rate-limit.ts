import { createAdminClient } from "@/lib/supabase/admin";

// Rate-limiting persistant, partagé entre toutes les instances serverless via
// une fonction SQL atomique (voir migration 00046_rate_limits.sql). Le Map en
// mémoire précédent ne freinait rien sur Vercel (un bucket par lambda).
//
// Politique en cas d'erreur infra : « fail-open » — on laisse passer plutôt que
// de provoquer un outage si la base ne répond pas. Le rate-limit reste une
// protection anti-abus, pas un contrôle de sécurité critique.
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("hit_rate_limit", {
      bucket: key,
      max_hits: max,
      window_ms: windowMs,
    });
    if (error) {
      console.error("rateLimit: rpc failed (fail-open)", { key, error });
      return true;
    }
    return data !== false;
  } catch (err) {
    console.error("rateLimit: unexpected error (fail-open)", { key, err });
    return true;
  }
}

export function clientIp(request: Request): string {
  // Sur Vercel, x-forwarded-for est réécrit par l'edge : la première valeur est
  // l'IP client réelle. x-real-ip sert de repli.
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
