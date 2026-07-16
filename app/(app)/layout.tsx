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
  const [topupResult, profileResult, accountAccess] = await Promise.all([
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
  let pendingOrders = 0;
  let lowStock = 0;
  if (activePageId) {
    const [{ count: pending }, { count: low }] = await Promise.all([
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
    ]);
    pendingOrders = pending ?? 0;
    lowStock = low ?? 0;
  }

  return (
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
              projects={projects}
              activeProjectId={activePageId}
            />
          </div>
          <div className={styles.mobileBrand}>
            <FluxBrand markOnly />
          </div>
          <div className={styles.mobileActions}>
            <CreditsLink balance={balance ?? 0} className={styles.credits} />
            <MobileAppMenu
              balance={balance ?? 0}
              pendingOrders={pendingOrders}
              lowStock={lowStock}
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
        {upsellDue && accountAccess.status !== "subscribed" && (
          <AccountUpsellDialog
            status={accountAccess.status}
            balance={balance ?? 0}
          />
        )}
        {children}
      </main>
      <MobileBottomNavigation pendingOrders={pendingOrders} lowStock={lowStock} />
    </div>
  );
}
