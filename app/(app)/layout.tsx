import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import styles from "./app-shell.module.css";
import { MobileBottomNavigation } from "@/components/app-navigation";
import { MobileAppMenu } from "@/components/mobile-app-menu";
import { DesktopAppNavigation } from "@/components/desktop-app-navigation";
import { AppBadgeSync } from "@/components/app-badge-sync";
import { TrialBanner } from "@/components/trial-banner";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { FluxBrand } from "@/components/flux-brand";
import { CreditsLink } from "@/components/credits-link";
import { AccountUpsellDialog } from "@/components/account-upsell-dialog";
import {
  isAccountUpsellDue,
  loadAccountAccess,
} from "@/lib/account-status";
import { healMissingProfile } from "@/lib/profile-heal";
import type { Profile } from "@/lib/types";
import { SessionTracker } from "@/components/session-tracker";
import { getAccountLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocalizedVerticals, getLocalizedFonts } from "@/lib/verticals-i18n";
import { getPageTemplates, toPageTemplateMeta } from "@/lib/page-templates-i18n";
import { DashboardLanguageSwitcher } from "@/components/dashboard-language-switcher";
import { Suspense } from "react";
import { AppAssistant } from "@/components/assistant/app-assistant";
import { AppRouteCoach } from "@/components/assistant/app-route-coach";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Recharge paresseuse selon la formule + solde à jour, affiché dans le
  // header. L'état d'essai alimente la bannière sous le header.
  const [topupResult, profileResult, accountAccess, locale] = await Promise.all([
    supabase.rpc("apply_plan_topup", { uid: user.id }),
    supabase
      .from("profiles")
      .select("trial_ends_at, subscription_status, email_verified_at, upsell_last_shown_at")
      .eq("user_id", user.id)
      .single<
        Pick<
          Profile,
          | "trial_ends_at"
          | "subscription_status"
          | "email_verified_at"
          | "upsell_last_shown_at"
        >
      >(),
    loadAccountAccess(user.id),
    getAccountLocale(supabase, user.id),
  ]);
  const [dictionary, editorDict, offersDict, productsDict, verticals, fonts, pageTemplates] =
    await Promise.all([
      getDictionary(locale, "dashboard"),
      getDictionary(locale, "editor"),
      getDictionary(locale, "offers"),
      getDictionary(locale, "products"),
      getLocalizedVerticals(locale),
      getLocalizedFonts(locale),
      getPageTemplates(locale),
    ]);
  let balance = topupResult.data;
  let trialProfile = profileResult.data;

  // Session valide mais profil absent : la ligne a été supprimée hors de
  // l'app (vu en vrai — nettoyage manuel dans Supabase Studio). Sans elle,
  // /compte, /commencer et les bannières cassent en silence. On la recrée à
  // la volée, puis on relit ce qui en dépend.
  if (!trialProfile && (await healMissingProfile(supabase, user))) {
    [{ data: balance }, { data: trialProfile }] = await Promise.all([
      supabase.rpc("apply_plan_topup", { uid: user.id }),
      supabase
        .from("profiles")
        .select("trial_ends_at, subscription_status, email_verified_at, upsell_last_shown_at")
        .eq("user_id", user.id)
        .single<
          Pick<
            Profile,
            | "trial_ends_at"
            | "subscription_status"
            | "email_verified_at"
            | "upsell_last_shown_at"
          >
        >(),
    ]);
  }

  const upsellDue =
    !accountAccess.isSubscribed &&
    isAccountUpsellDue(trialProfile?.upsell_last_shown_at ?? null);

  // Projet actif + liste des projets (pour le switcher).
  const [activePageId, { data: pages }] = await Promise.all([
    getActivePageId(supabase, user.id),
    supabase
      .from("pages")
      .select("id, business_name, slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);
  const projects = pages ?? [];

  // Badges de la nav : uniquement le PROJET ACTIF (pas tous les projets).
  // statsAttention = notifications non lues qui pointent vers les statistiques
  // (nouvel abonné newsletter, vues quotidiennes) — le signal « attention » de
  // l'onglet Stats, comme pendingOrders l'est pour Commandes.
  let pendingOrders = 0;
  let lowStock = 0;
  let statsAttention = 0;
  if (activePageId) {
    const [{ count: pending }, { count: low }, { count: stats }] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("page_id", activePageId)
        .eq("status", "pending"),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("page_id", activePageId)
        .eq("track_stock", true)
        .lte("stock", 0),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("page_id", activePageId)
        .eq("read", false)
        .in("type", ["newsletter_signup", "daily_views"]),
    ]);
    pendingOrders = pending ?? 0;
    lowStock = low ?? 0;
    statsAttention = stats ?? 0;
  }

  return (
    <I18nProvider
      locale={locale}
      dictionary={dictionary}
      editor={editorDict}
      offers={offersDict}
      products={productsDict}
      verticals={verticals}
      fonts={fonts}
      pageTemplates={pageTemplates.map(toPageTemplateMeta)}
      languageChangeFree={projects.length === 0}
    >
    <div className={styles.shell}>
      <SessionTracker />
      <AppBadgeSync pendingOrders={pendingOrders ?? 0} />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.desktopHeaderContent}>
            <DesktopAppNavigation
              balance={balance ?? 0}
              pendingOrders={pendingOrders}
              lowStock={lowStock}
              statsAttention={statsAttention}
              projects={projects}
              activeProjectId={activePageId}
            />
          </div>
          <div className={styles.mobileBrand}>
            <FluxBrand markOnly />
          </div>
          <div className={styles.mobileActions}>
            <DashboardLanguageSwitcher />
            <CreditsLink balance={balance ?? 0} className={styles.credits} />
            <MobileAppMenu
              balance={balance ?? 0}
              pendingOrders={pendingOrders}
              lowStock={lowStock}
              statsAttention={statsAttention}
            />
          </div>
        </div>
      </header>
      <main className={styles.main}>
        {trialProfile && !trialProfile.email_verified_at && (
          <EmailVerificationBanner />
        )}
        {trialProfile && (
          <TrialBanner profile={trialProfile} balance={balance ?? 0} />
        )}
        {upsellDue && accountAccess.status !== "subscribed" && accountAccess.status !== "suspended" && (
          <AccountUpsellDialog
            status={accountAccess.status}
            balance={balance ?? 0}
          />
        )}
        <AppRouteCoach />
        {children}
      </main>
      <MobileBottomNavigation
        pendingOrders={pendingOrders}
        lowStock={lowStock}
        statsAttention={statsAttention}
      />
      <Suspense fallback={null}>
        <AppAssistant userId={user.id} />
      </Suspense>
    </div>
    </I18nProvider>
  );
}
