"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  ShoppingBag,
  Store,
} from "lucide-react";
import styles from "@/app/(app)/app-shell.module.css";

const ITEMS = [
  { href: "/espace", label: "Accueil", icon: LayoutDashboard },
  { href: "/ma-page", label: "Vitrine", icon: Store },
  { href: "/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/resultats", label: "Contenus", icon: FolderOpen },
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

  return (
    <nav
      className={mobile ? styles.mobileNav : styles.sidebarNav}
      aria-label={mobile ? "Navigation mobile" : "Navigation principale"}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const badge =
          href === "/commandes"
            ? pendingOrders
            : href === "/stock"
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
