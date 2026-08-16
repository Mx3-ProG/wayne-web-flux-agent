import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INTEGRATIONS_CATALOG, type IntegrationCatalogEntry } from "@/lib/integrations/catalog";

export type IntegrationListEntry = IntegrationCatalogEntry & {
  status: "connected" | "disconnected" | "error" | "needs_reauth";
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
};

// Partagé entre app/api/integrations (fetch client) et la page serveur
// /compte/integrations (rendu initial) — une seule requête, pas deux
// implémentations du même merge catalogue/statut.
export async function listIntegrationsForPage(
  supabase: SupabaseClient,
  pageId: string
): Promise<IntegrationListEntry[]> {
  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider, status, last_synced_at, last_sync_status, last_error")
    .eq("page_id", pageId);

  const byProvider = new Map((integrations ?? []).map((i) => [i.provider, i]));

  return INTEGRATIONS_CATALOG.map((entry) => ({
    ...entry,
    status: byProvider.get(entry.provider)?.status ?? "disconnected",
    lastSyncedAt: byProvider.get(entry.provider)?.last_synced_at ?? null,
    lastSyncStatus: byProvider.get(entry.provider)?.last_sync_status ?? null,
    lastError: byProvider.get(entry.provider)?.last_error ?? null,
  }));
}
