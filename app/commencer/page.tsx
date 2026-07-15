import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadJourneySignals } from "@/lib/journey-signals";
import { journeyState } from "@/lib/journey";
import { trialDaysLeft } from "@/lib/plans";
import type { Profile, TunnelDraft } from "@/lib/types";
import { AccountGate } from "@/components/tunnel/account-gate";
import { Tunnel } from "./tunnel";

export const metadata: Metadata = {
  title: "Créons ton espace",
  description:
    "Configure gratuitement ton espace Wayne Web Flux et ta présence en ligne en quelques étapes.",
};

// Le tunnel a deux états, et c'est cette page qui tranche (proxy.ts ne redirige
// plus /commencer) :
//   - visiteur  → création de compte ;
//   - connecté  → suite du Parcours, reprise là où il s'est arrêté.
export default async function CommencerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AccountGate />;

  const [{ data: profile }, journey] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, onboarding_step, onboarding_draft, trial_ends_at")
      .eq("user_id", user.id)
      .single<
        Pick<Profile, "name" | "onboarding_step" | "onboarding_draft" | "trial_ends_at">
      >(),
    loadJourneySignals(supabase, user.id),
  ]);

  const { steps, completedCount, total } = journeyState(journey.signals);
  const draft: TunnelDraft = profile?.onboarding_draft ?? {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.flux-wayne.com";

  return (
    <Tunnel
      firstName={profile?.name ?? ""}
      draft={draft}
      cursor={profile?.onboarding_step ?? 0}
      trialDays={
        profile ? trialDaysLeft({ trial_ends_at: profile.trial_ends_at }) : 7
      }
      steps={steps}
      completedCount={completedCount}
      total={total}
      pageUrl={journey.page ? `${siteUrl}/p/${journey.page.slug}` : null}
      balance={journey.balance}
      generationCount={journey.signals.generationCount}
      upcomingBookings={journey.signals.upcomingBookings}
    />
  );
}
