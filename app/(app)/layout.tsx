import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePageId } from "@/lib/active-project";
import { Coins } from "lucide-react";
import styles from "./app-shell.module.css";
import { AppNavigation } from "@/components/app-navigation";
import { MobileAppMenu } from "@/components/mobile-app-menu";
import { AppBadgeSync } from "@/components/app-badge-sync";
import { ProjectSwitcher } from "@/components/project-switcher";
import { TrialBanner } from "@/components/trial-banner";
import type { Profile } from "@/lib/types";

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
  const [{ data: balance }, { data: trialProfile }] = await Promise.all([
    supabase.rpc("apply_plan_topup", { uid: user.id }),
    supabase
      .from("profiles")
      .select("trial_ends_at, subscribed_at")
      .eq("user_id", user.id)
      .single<Pick<Profile, "trial_ends_at" | "subscribed_at">>(),
  ]);

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
      <AppBadgeSync pendingOrders={pendingOrders ?? 0} />
      <aside className={styles.sidebar}>
        <Link href="/espace" className={styles.brand}>
          <span className={styles.brandMark}>W</span>
          <span className={styles.brandWords}>WAYNE<b>WEB</b><small>FLUX</small></span>
        </Link>
        {projects.length > 0 && (
          <div className={styles.switcher}>
            <ProjectSwitcher projects={projects} activeId={activePageId} />
          </div>
        )}
        <AppNavigation pendingOrders={pendingOrders} lowStock={lowStock} />
        <p className={styles.sidebarHint}>Ton commerce.<br />Un seul espace.</p>
      </aside>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.mobileBrand}>
            <span className={styles.brandMark}>W</span>
            <span>Wayne Web Flux</span>
          </div>
          <div className={styles.actions}>
            <Link
              href="/credits"
              className={styles.credits}
            >
              <Coins aria-hidden="true" /> {balance ?? 0}
            </Link>
            <MobileAppMenu
              balance={balance ?? 0}
              pendingOrders={pendingOrders}
              lowStock={lowStock}
            />
          </div>
        </div>
      </header>
      <main className={styles.main}>
        {trialProfile && <TrialBanner profile={trialProfile} />}
        {children}
      </main>
      <AppNavigation mobile pendingOrders={pendingOrders} lowStock={lowStock} />
    </div>
  );
}
