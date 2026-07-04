"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  BadgePercent,
  Boxes,
  CalendarDays,
  ChevronRight,
  Coins,
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
import styles from "@/app/(app)/app-shell.module.css";

type DrawerItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "orders" | "stock";
  activeRoot?: string;
};

const GROUPS: { label: string; items: DrawerItem[] }[] = [
  {
    label: "L’essentiel",
    items: [
      { href: "/espace", label: "Accueil", icon: LayoutDashboard },
      { href: "/projets", label: "Mes projets", icon: Layers },
      { href: "/ma-page", label: "Ma vitrine", icon: Store },
      { href: "/commandes", label: "Mes commandes", icon: ShoppingBag, badge: "orders" },
      { href: "/offres", label: "Mes offres", icon: BadgePercent },
    ],
  },
  {
    label: "Mon commerce",
    items: [
      { href: "/produits", label: "Mes produits", icon: Boxes, badge: "stock" },
      { href: "/agenda", label: "Mon agenda", icon: CalendarDays },
      { href: "/resultats", label: "Mes contenus", icon: FolderOpen },
      { href: "/installer", label: "Installer l’app", icon: Smartphone },
      { href: "/contexte/configurer", label: "FLUX – IA", icon: MessageSquareText, activeRoot: "/contexte" },
    ],
  },
  {
    label: "Mon compte",
    items: [
      { href: "/compte", label: "Voir mon profil", icon: UserRound },
    ],
  },
];

export function MobileAppMenu({
  balance,
  pendingOrders,
  lowStock,
}: {
  balance: number;
  pendingOrders: number;
  lowStock: number;
}) {
  const pathname = usePathname();
  const drawerId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

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
    <>
      <button
        type="button"
        className={styles.menuTrigger}
        aria-controls={drawerId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden="true" />
        <span>Menu</span>
      </button>

      <div
        className={`${styles.drawerLayer} ${open ? styles.drawerLayerOpen : ""}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={styles.drawerBackdrop}
          aria-label="Fermer le menu"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />

        <aside
          id={drawerId}
          className={styles.mobileDrawer}
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          <div className={styles.drawerHeader}>
            <Link href="/espace" className={styles.drawerBrand} onClick={() => setOpen(false)}>
              <span className={styles.brandMark}>W</span>
              <span className={styles.brandWords}>WAYNE<b>WEB</b><small>FLUX</small></span>
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              className={styles.drawerClose}
              aria-label="Fermer le menu"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className={styles.drawerIdentity}>
            <span className={styles.drawerAvatar}>W</span>
            <span>
              <strong>Mon espace</strong>
              <small>Wayne-Web Flux</small>
            </span>
          </div>

          <div className={styles.drawerScroll}>
            {GROUPS.map((group) => (
              <section className={styles.drawerGroup} key={group.label}>
                <h2>{group.label}</h2>
                <nav aria-label={group.label}>
                  {group.items.map(({ href, label, icon: Icon, badge, activeRoot }) => {
                    const activePath = activeRoot ?? href;
                    const active =
                      pathname === activePath || pathname.startsWith(`${activePath}/`);
                    const badgeValue =
                      badge === "orders"
                        ? pendingOrders
                        : badge === "stock"
                          ? lowStock
                          : 0;

                    return (
                      <Link
                        href={href}
                        key={href}
                        className={active ? styles.drawerLinkActive : styles.drawerLink}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                        {badgeValue > 0 && (
                          <span className={styles.drawerBadge}>
                            {badgeValue > 99 ? "99+" : badgeValue}
                          </span>
                        )}
                        <ChevronRight className={styles.drawerChevron} aria-hidden="true" />
                      </Link>
                    );
                  })}
                </nav>
              </section>
            ))}
          </div>

          <div className={styles.drawerFooter}>
            <Link href="/credits" className={styles.drawerCreditLink} onClick={() => setOpen(false)}>
              <Coins aria-hidden="true" />
              <span><strong>{balance}</strong> crédits</span>
              <ChevronRight aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
