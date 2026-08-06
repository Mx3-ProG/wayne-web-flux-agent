"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgePercent,
  Boxes,
  CalendarDays,
  ChartLine,
  ChevronRight,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  ShoppingBag,
  Smartphone,
  Store,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { FluxBrand } from "@/components/flux-brand";
import { ProjectSwitcher } from "@/components/project-switcher";
import { CreditsLink } from "@/components/credits-link";
import { DashboardLanguageSwitcher } from "@/components/dashboard-language-switcher";
import { useI18n } from "@/components/i18n-provider";
import styles from "@/components/desktop-app-navigation.module.css";
import { useAssistantMenuPresence } from "@/components/assistant/use-assistant-menu-presence";

type Project = { id: string; business_name: string; slug: string };

type DesktopNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "orders" | "stock" | "stats";
  activeRoot?: string;
};

function isActive(pathname: string, item: DesktopNavItem) {
  const activePath = item.activeRoot ?? item.href;
  return pathname === activePath || pathname.startsWith(`${activePath}/`);
}

function getBadge(
  badge: DesktopNavItem["badge"],
  pendingOrders: number,
  lowStock: number,
  statsAttention: number,
) {
  if (badge === "orders") return pendingOrders;
  if (badge === "stock") return lowStock;
  if (badge === "stats") return statsAttention;
  return 0;
}

export function DesktopAppNavigation({
  balance,
  pendingOrders,
  lowStock,
  statsAttention = 0,
  projects,
  activeProjectId,
}: {
  balance: number;
  pendingOrders: number;
  lowStock: number;
  statsAttention?: number;
  projects: Project[];
  activeProjectId: string | null;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.nav;
  const groups: { label: string; items: DesktopNavItem[] }[] = [
    { label: t.groups.control, items: [
      { href: "/espace", label: t.items.home, icon: LayoutDashboard },
      { href: "/projets", label: t.items.projects, icon: Layers },
      { href: "/ma-page", label: t.items.storefront, icon: Store },
      { href: "/commandes", label: t.items.orders, icon: ShoppingBag, badge: "orders" },
    ] },
    { label: t.groups.sell, items: [
      { href: "/offres/configurer", label: t.items.offers, icon: BadgePercent, activeRoot: "/offres" },
      { href: "/produits/configurer", label: t.items.products, icon: Boxes, badge: "stock", activeRoot: "/produits" },
      { href: "/agenda", label: t.items.agenda, icon: CalendarDays },
      { href: "/statistiques", label: t.items.stats, icon: ChartLine, badge: "stats" },
    ] },
    { label: t.groups.grow, items: [
      { href: "/resultats", label: t.items.content, icon: FolderOpen },
      { href: "/contexte/configurer", label: t.items.ai, icon: MessageSquareText, activeRoot: "/contexte" },
      { href: "/installer", label: t.items.install, icon: Smartphone },
      { href: "/compte", label: t.items.profile, icon: UserRound },
    ] },
  ];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useAssistantMenuPresence("dashboard-desktop-navigation", open);
  // Total « attention » affiché sur le bouton menu quand il est fermé : la
  // somme de tout ce qui requiert une action (commandes, stock, stats).
  const totalAttention = pendingOrders + lowStock + statsAttention;

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 979px)");
    const closeOnMobile = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    mobileQuery.addEventListener("change", closeOnMobile);
    return () => mobileQuery.removeEventListener("change", closeOnMobile);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-label={open ? t.close : t.open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span>{t.menu}</span>
          {!open && totalAttention > 0 && (
            <span
              className={styles.menuBadge}
              aria-label={t.pending.replace("{count}", String(totalAttention))}
            >
              {totalAttention > 99 ? "99+" : totalAttention}
            </span>
          )}
        </button>

        <Link href="/espace" className={styles.logo} aria-label={t.homeAria}>
          <FluxBrand markOnly />
        </Link>

        <div className={styles.actions}>
          <DashboardLanguageSwitcher />
          <CreditsLink balance={balance} className={styles.credits} />
          <Link
            href="/compte"
            className={pathname.startsWith("/compte") ? styles.profileActive : styles.profile}
            aria-label={t.items.profile}
          >
            <UserRound aria-hidden="true" />
          </Link>
        </div>
      </div>

      {open && (
        <div className={styles.megaMenu} aria-label={t.mainAria}>
          <div className={styles.megaInner}>
            <div className={styles.intro}>
              <div>
                <span className={styles.eyebrow}>WayneWeb FLUX</span>
                <h1>{t.title}</h1>
              </div>
              {projects.length > 0 && (
                <div className={styles.projectContext}>
                  <span>{t.activeProject}</span>
                  <ProjectSwitcher projects={projects} activeId={activeProjectId} />
                </div>
              )}
            </div>

            <nav className={styles.grid}>
              {groups.map((group) => (
                <section className={styles.group} key={group.label}>
                  <h2>{group.label}</h2>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item);
                    const badge = getBadge(item.badge, pendingOrders, lowStock, statsAttention);

                    return (
                      <Link
                        href={item.href}
                        key={item.href}
                        className={active ? styles.linkActive : styles.link}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <span className={styles.linkIcon}><Icon aria-hidden="true" /></span>
                        <span>{item.label}</span>
                        {badge > 0 && <strong>{badge > 99 ? "99+" : badge}</strong>}
                        <ChevronRight aria-hidden="true" />
                      </Link>
                    );
                  })}
                </section>
              ))}
            </nav>

            <footer className={styles.footer}>
              <span>{t.tagline}</span>
              <Link href="/credits" onClick={() => setOpen(false)}>{t.manageCredits}</Link>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
