"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  Boxes,
  CalendarDays,
  FolderOpen,
  Layers,
  Smartphone,
  LayoutDashboard,
  MessageSquareText,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import styles from "@/app/(app)/app-shell.module.css";

const DESKTOP_ITEMS = [
  { href: "/espace", label: "Accueil", icon: LayoutDashboard },
  { href: "/projets", label: "Mes projets", icon: Layers },
  { href: "/ma-page", label: "Vitrine", icon: Store },
  { href: "/offres", label: "Offres", icon: BadgePercent },
  { href: "/produits", label: "Produits", icon: Boxes },
  { href: "/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/resultats", label: "Contenus", icon: FolderOpen },
  { href: "/contexte/configurer", label: "FLUX – IA", icon: MessageSquareText },
  { href: "/installer", label: "Installer l’app", icon: Smartphone },
  { href: "/compte", label: "Profil", icon: UserRound },
];

const MOBILE_ITEMS = [
  { href: "/espace", label: "Accueil", icon: LayoutDashboard },
  { href: "/produits", label: "Produits", icon: Boxes },
  { href: "/offres", label: "Offres", icon: BadgePercent },
  { href: "/commandes", label: "Commandes", icon: ShoppingBag },
];

export function AppNavigation({
  mobile = false,
  pendingOrders = 0,
  lowStock = 0,
}: {
  mobile?: boolean;
  pendingOrders?: number;
  lowStock?: number;
}) {
  const pathname = usePathname();
  const items = mobile ? MOBILE_ITEMS : DESKTOP_ITEMS;

  return (
    <nav
      className={mobile ? styles.mobileNav : styles.sidebarNav}
      aria-label={mobile ? "Navigation mobile" : "Navigation principale"}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const badge =
          href === "/commandes"
            ? pendingOrders
            : href === "/produits"
              ? lowStock
              : 0;
        return (
          <Link
            href={href}
            key={href}
            className={active ? styles.navLinkActive : styles.navLink}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.navIcon}>
              <Icon aria-hidden="true" />
              {badge > 0 && (
                <span className={styles.navBadge} aria-label={`${badge} en attente`}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
