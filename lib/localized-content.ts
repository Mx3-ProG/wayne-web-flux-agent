// Fusion du contenu publié (localized_content.published_fields, migration
// 00038) sur les entités invariantes chargées depuis les tables source. Ne
// lit jamais `fields`/`status` (brouillon de traduction en cours) : seule
// `published_fields` est visible côté public, ce qui garantit qu'une
// traduction partielle ou en erreur ne remplace jamais le contenu publié
// (publication atomique, Lot 6).

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n/config";

type PublishedRow = {
  entity_type: string;
  entity_id: string;
  published_fields: Record<string, unknown>;
};

export type TranslationMap = Map<string, Record<string, unknown>>;

function key(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

// Traductions publiées d'une page pour une langue donnée (hors langue
// principale). Vide si rien n'est encore publié dans cette langue.
export async function loadPublishedTranslations(
  supabase: SupabaseClient,
  pageId: string,
  locale: Locale
): Promise<TranslationMap> {
  const { data } = await supabase
    .from("localized_content")
    .select("entity_type, entity_id, published_fields")
    .eq("page_id", pageId)
    .eq("locale", locale)
    .not("published_fields", "is", null);
  const map: TranslationMap = new Map();
  for (const row of (data ?? []) as PublishedRow[]) {
    map.set(key(row.entity_type, row.entity_id), row.published_fields);
  }
  return map;
}

// Fusionne les champs traduisibles présents dans `translated` sur `base`.
// Seules les clés listées dans `keys` sont écrasées : tout le reste
// (prix, ids, statuts, positions, médias…) reste invariant, tel que chargé
// depuis la table source.
export function applyTranslation<T extends Record<string, unknown>>(
  base: T,
  translated: Record<string, unknown> | undefined,
  keys: (keyof T & string)[]
): T {
  if (!translated) return base;
  const merged = { ...base };
  for (const k of keys) {
    if (k in translated) merged[k] = translated[k] as T[typeof k];
  }
  return merged;
}

export function translationFor(
  map: TranslationMap,
  entityType: string,
  entityId: string
): Record<string, unknown> | undefined {
  return map.get(key(entityType, entityId));
}
