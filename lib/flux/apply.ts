import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { validateDraftPatch, type FluxDraftPatch } from "@/lib/flux/guardrails";

type Db = Awaited<ReturnType<typeof createClient>>;

// Applique un patch FLUX au BROUILLON de la vitrine (jamais aux colonnes live).
// Valide d'abord (guardrails), puis merge jsonb côté SQL (merge_page_draft) —
// exactement le même chemin que l'éditeur manuel. L'utilisateur publie ensuite
// lui-même (publish_page, 5 crédits).
export async function applyFluxPatch(
  supabase: Db,
  pageId: string,
  patch: FluxDraftPatch
): Promise<{ error?: string }> {
  const result = validateDraftPatch(patch);
  if (!result.ok) return { error: result.error };
  if (Object.keys(result.patch).length === 0) return {};

  const { error } = await supabase.rpc("merge_page_draft", {
    pid: pageId,
    fields: result.patch,
  });
  if (error) return { error: "Enregistrement impossible." };
  return {};
}
