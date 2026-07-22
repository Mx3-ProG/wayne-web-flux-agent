import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadJourneySignals } from "@/lib/journey-signals";
import { journeyState } from "@/lib/journey";
import { trialDaysLeft } from "@/lib/plans";
import { GOOGLE_FONTS_URL } from "@/lib/verticals";
import { healMissingProfile } from "@/lib/profile-heal";
import type { Profile, TunnelDraft } from "@/lib/types";
import { getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { languageAlternates } from "@/lib/i18n/seo";
import { getLocalizedVerticals, getCatalogWording, getLocalizedFonts } from "@/lib/verticals-i18n";
import { Tunnel } from "./tunnel";
import { PreAccountStart } from "@/components/tunnel/pre-account-start";
import { FluxAssistantHost } from "@/components/assistant/flux-assistant-host";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: "Créons ton espace",
    description:
      "Configure gratuitement ton espace Wayne Web Flux et ta présence en ligne en quelques étapes.",
    alternates: languageAlternates(locale, "/commencer"),
  };
}

// Le tunnel a deux états, et c'est cette page qui tranche (proxy.ts ne redirige
// plus /commencer) :
//   - visiteur  → création de compte ;
//   - connecté  → suite du Parcours, reprise là où il s'est arrêté.
export default async function CommencerPage() {
  const supabase = await createClient();
  const locale = await getRequestLocale();
  const [
    {
      data: { user },
    },
    dict,
    journeyDict,
    verticals,
    catalogWordingService,
    catalogWordingProduct,
    catalogWordingHybrid,
    fonts,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getDictionary(locale, "tunnel"),
    getDictionary(locale, "journey"),
    getLocalizedVerticals(locale),
    getCatalogWording("service", locale),
    getCatalogWording("product", locale),
    getCatalogWording("hybrid", locale),
    getLocalizedFonts(locale),
  ]);
  const catalogWordingByKind = {
    service: catalogWordingService,
    product: catalogWordingProduct,
    hybrid: catalogWordingHybrid,
  };

  if (!user) {
    return (
      <>
        <PreAccountStart dict={dict} locale={locale} />
        <FluxAssistantHost surface="onboarding" />
      </>
    );
  }

  const [profileResult, journey] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, onboarding_step, onboarding_draft, trial_ends_at, locale")
      .eq("user_id", user.id)
      .single<
        Pick<Profile, "name" | "onboarding_step" | "onboarding_draft" | "trial_ends_at" | "locale">
      >(),
    loadJourneySignals(supabase, user.id),
  ]);
  let profile = profileResult.data;

  // Profil manquant : sans cette ligne, chaque saveTunnelDraft est un UPDATE
  // sur zéro ligne — le tunnel semble avancer mais ne sauvegarde jamais rien.
  // On recrée la ligne avant de rendre quoi que ce soit (lib/profile-heal.ts).
  if (!profile && (await healMissingProfile(supabase, user))) {
    ({ data: profile } = await supabase
      .from("profiles")
      .select("name, onboarding_step, onboarding_draft, trial_ends_at, locale")
      .eq("user_id", user.id)
      .single<
        Pick<Profile, "name" | "onboarding_step" | "onboarding_draft" | "trial_ends_at" | "locale">
      >());
  }

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
        dict={dict}
        journeyDict={journeyDict}
        verticals={verticals}
        catalogWordingByKind={catalogWordingByKind}
        fonts={fonts}
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
      <FluxAssistantHost
        surface="onboarding"
        context={{
          activeProjectId: journey.page?.id,
          journey: journey.signals,
        }}
        persistToAccount
      />
    </>
  );
}
