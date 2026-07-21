"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  ChartLine,
  LayoutDashboard,
  ShoppingBag,
} from "lucide-react";
import styles from "@/app/(app)/app-shell.module.css";
import { useI18n } from "@/components/i18n-provider";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  // Racine utilisée pour l'état actif quand le lien pointe vers un tunnel
  // (ex : Offres → /offres/configurer, actif sur tout /offres).
  activeRoot?: string;
};

export function MobileBottomNavigation({
  pendingOrders = 0,
  lowStock = 0,
}: {
  pendingOrders?: number;
  lowStock?: number;
}) {
  const pathname = usePathname();
  const { dictionary } = useI18n();
  const t = dictionary.nav;
  const items: NavItem[] = [
    { href: "/espace", label: t.items.home, icon: LayoutDashboard },
    { href: "/statistiques", label: t.items.statsShort, icon: ChartLine },
    { href: "/commandes", label: t.items.ordersShort, icon: ShoppingBag },
    { href: "/offres/configurer", label: t.items.offersShort, icon: BadgePercent, activeRoot: "/offres" },
  ];

  return (
    <nav
      className={styles.mobileNav}
      aria-label={t.mobileAria}
    >
      {items.map(({ href, label, icon: Icon, activeRoot }) => {
        const activePath = activeRoot ?? href;
        const active =
          pathname === activePath || pathname.startsWith(`${activePath}/`);
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
                <span className={styles.navBadge} aria-label={t.pending.replace("{count}", String(badge))}>
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
