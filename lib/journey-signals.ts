import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Generation, Page, VoiceProfile } from "@/lib/types";
import { getActivePage } from "@/lib/active-project";
import { voiceCompletion } from "@/lib/voice";
import { getVertical } from "@/lib/verticals";
import { parisNow } from "@/lib/slots";
import type { JourneySignals } from "@/lib/journey";

type Db = Awaited<ReturnType<typeof createClient>>;

// Séparé de lib/journey.ts parce que celui-ci est importé par des composants
// client : y mettre des requêtes Supabase ferait fuiter le client serveur dans
// le bundle navigateur.
export type JourneyContext = {
  signals: JourneySignals;
  page: Page | null;
  voice: VoiceProfile | null;
  generations: Generation[];
  balance: number;
  revenueCents: number;
};

// Charge tout ce dont le Parcours a besoin, pour le tunnel comme pour le
// dashboard. `page` est résolu via getActivePage (projet actif), donc le
// Parcours est bien par projet, comme journey_completed_steps.
export async function loadJourneySignals(
  db: Db,
  userId: string
): Promise<JourneyContext> {
  const page = await getActivePage(db, userId);

  const [{ data: voice }, { data: balance }] = await Promise.all([
    page
      ? db
          .from("voice_profiles")
          .select("*")
          .eq("page_id", page.id)
          .maybeSingle<VoiceProfile>()
      : Promise.resolve({ data: null as VoiceProfile | null }),
    db.rpc("credit_balance", { uid: userId }),
  ]);

  let upcomingBookings = 0;
  let generations: Generation[] = [];
  let revenueCents = 0;
  let productCount = 0;
  let offerCount = 0;
  let openScheduleCount = 0;

  if (page) {
    const today = parisNow().date;
    const [
      { data: rev },
      { count: bookings },
      { data: gens },
      { count: products },
      { count: offers },
      { count: schedules },
    ] = await Promise.all([
      db.rpc("revenue_total", { p_page: page.id }),
      db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("page_id", page.id)
        .eq("status", "confirmed")
        .gte("date", today),
      db
        .from("generations")
        .select("*")
        .eq("user_id", userId)
        .eq("page_id", page.id)
        .limit(5),
      db
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("page_id", page.id),
      db
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("page_id", page.id),
      db
        .from("schedules")
        .select("weekday", { count: "exact", head: true })
        .eq("page_id", page.id)
        .eq("open", true),
    ]);

    revenueCents = Number(rev ?? 0);
    upcomingBookings = bookings ?? 0;
    generations = (gens ?? []) as Generation[];
    productCount = products ?? 0;
    offerCount = offers ?? 0;
    openScheduleCount = schedules ?? 0;
  }

  return {
    page,
    voice: voice ?? null,
    generations,
    balance: Number(balance ?? 0),
    revenueCents,
    signals: {
      hasPage: !!page,
      voiceCompletion: voiceCompletion(voice ?? null, !!page),
      productCount,
      offerCount,
      openScheduleCount,
      generationCount: generations.length,
      upcomingBookings,
      manualSteps: page?.journey_completed_steps ?? [],
      // Pas de page = pas encore de verticale choisie : on part du tronc commun
      // le plus large (toutes les étapes s'appliquent).
      verticalKind: page?.vertical ? getVertical(page.vertical).kind : "hybrid",
    },
  };
}
