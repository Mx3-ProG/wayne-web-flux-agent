import type { createClient } from "@/lib/supabase/server";
import type { Page } from "@/lib/types";

type Db = Awaited<ReturnType<typeof createClient>>;

// Résout le « projet actif » d'un utilisateur : la page définie dans
// profiles.active_page_id si elle existe et lui appartient, sinon sa page la
// plus récente, sinon null. Remplace partout les anciens lookups
// « la page du user » (une-page-par-user).
export async function getActivePage(db: Db, userId: string): Promise<Page | null> {
  const { data: profile } = await db
    .from("profiles")
    .select("active_page_id")
    .eq("user_id", userId)
    .maybeSingle<{ active_page_id: string | null }>();

  if (profile?.active_page_id) {
    const { data: active } = await db
      .from("pages")
      .select("*")
      .eq("id", profile.active_page_id)
      .eq("user_id", userId)
      .maybeSingle<Page>();
    if (active) return active;
  }

  // Repli : la page la plus récente (ou l'unique) du user.
  const { data: fallback } = await db
    .from("pages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Page>();
  return fallback ?? null;
}

export async function getActivePageId(db: Db, userId: string): Promise<string | null> {
  const page = await getActivePage(db, userId);
  return page?.id ?? null;
}
