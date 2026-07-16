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
import styles from "@/components/desktop-app-navigation.module.css";

type Project = { id: string; business_name: string; slug: string };

type DesktopNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "orders" | "stock";
  activeRoot?: string;
};

const GROUPS: { label: string; items: DesktopNavItem[] }[] = [
  {
    label: "Piloter",
    items: [
      { href: "/espace", label: "Accueil", icon: LayoutDashboard },
      { href: "/projets", label: "Mes projets", icon: Layers },
      { href: "/ma-page", label: "Ma vitrine", icon: Store },
      { href: "/commandes", label: "Mes commandes", icon: ShoppingBag, badge: "orders" },
    ],
  },
  {
    label: "Vendre",
    items: [
      { href: "/offres/configurer", label: "Mes offres", icon: BadgePercent, activeRoot: "/offres" },
      { href: "/produits/configurer", label: "Mes produits", icon: Boxes, badge: "stock", activeRoot: "/produits" },
      { href: "/agenda", label: "Mon agenda", icon: CalendarDays },
      { href: "/statistiques", label: "Mes statistiques", icon: ChartLine },
    ],
  },
  {
    label: "Développer",
    items: [
      { href: "/resultats", label: "Mes contenus", icon: FolderOpen },
      { href: "/contexte/configurer", label: "FLUX – IA", icon: MessageSquareText, activeRoot: "/contexte" },
      { href: "/installer", label: "Installer l’app", icon: Smartphone },
      { href: "/compte", label: "Mon profil", icon: UserRound },
    ],
  },
];

function isActive(pathname: string, item: DesktopNavItem) {
  const activePath = item.activeRoot ?? item.href;
  return pathname === activePath || pathname.startsWith(`${activePath}/`);
}

function getBadge(
  badge: DesktopNavItem["badge"],
  pendingOrders: number,
  lowStock: number,
) {
  if (badge === "orders") return pendingOrders;
  if (badge === "stock") return lowStock;
  return 0;
}

export function DesktopAppNavigation({
  balance,
  pendingOrders,
  lowStock,
  projects,
  activeProjectId,
}: {
  balance: number;
  pendingOrders: number;
  lowStock: number;
  projects: Project[];
  activeProjectId: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
          aria-label={open ? "Fermer la navigation" : "Ouvrir la navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span>Menu</span>
        </button>

        <Link href="/espace" className={styles.logo} aria-label="Accueil WayneWeb FLUX">
          <FluxBrand markOnly />
        </Link>

        <div className={styles.actions}>
          <CreditsLink balance={balance} className={styles.credits} />
          <Link
            href="/compte"
            className={pathname.startsWith("/compte") ? styles.profileActive : styles.profile}
            aria-label="Mon profil"
          >
            <UserRound aria-hidden="true" />
          </Link>
        </div>
      </div>

      {open && (
        <div className={styles.megaMenu} aria-label="Navigation principale">
          <div className={styles.megaInner}>
            <div className={styles.intro}>
              <div>
                <span className={styles.eyebrow}>WayneWeb FLUX</span>
                <h1>Navigation</h1>
              </div>
              {projects.length > 0 && (
                <div className={styles.projectContext}>
                  <span>Projet actif</span>
                  <ProjectSwitcher projects={projects} activeId={activeProjectId} />
                </div>
              )}
            </div>

            <nav className={styles.grid}>
              {GROUPS.map((group) => (
                <section className={styles.group} key={group.label}>
                  <h2>{group.label}</h2>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item);
                    const badge = getBadge(item.badge, pendingOrders, lowStock);

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
              <span>Ton commerce. Un seul espace.</span>
              <Link href="/credits" onClick={() => setOpen(false)}>Gérer mes crédits</Link>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
