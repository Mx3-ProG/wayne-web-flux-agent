import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadJourneySignals } from "@/lib/journey-signals";
import { journeyState } from "@/lib/journey";
import { trialDaysLeft } from "@/lib/plans";
import { GOOGLE_FONTS_URL } from "@/lib/verticals";
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
    <>
      {/* Les écrans design repris de l'assistant vitrine laissent choisir une
          police : sans les charger ici, comme le fait la vitrine publique, le
          choix ne se verrait pas dans l'aperçu. */}
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      <Tunnel
        firstName={profile?.name ?? ""}
        email={user.email ?? ""}
        userId={user.id}
        page={
          journey.page
            ? {
                logoUrl: journey.page.logo_url ?? "",
                heroUrl: journey.page.hero_url ?? "",
                font: journey.page.font,
                primary: journey.page.colors?.primary ?? "",
                dark: journey.page.colors?.dark ?? "",
                phone: journey.page.phone,
                address: journey.page.address,
                published: journey.page.published,
              }
            : null
        }
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
    </>
  );
}
