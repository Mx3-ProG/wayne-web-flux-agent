import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";

// Résout (utilisateur authentifié, page active) pour les routes API
// d'intégration — même convention que le reste de l'app (session-bound
// client, cf. app/api/push/subscribe). Retourne null si l'un des deux
// manque : au routes d'appeler unauthorized()/bad_request() en conséquence.
export async function requireActivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const pageId = await getActivePageId(supabase, user.id);
  if (!pageId) return null;

  return { supabase, userId: user.id, pageId };
}
