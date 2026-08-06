"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  BadgePercent,
  Boxes,
  CalendarDays,
  ChartLine,
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
import { FluxBrand } from "@/components/flux-brand";
import { useI18n } from "@/components/i18n-provider";
import { useAssistantMenuPresence } from "@/components/assistant/use-assistant-menu-presence";

type DrawerItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "orders" | "stock" | "stats";
  activeRoot?: string;
};

export function MobileAppMenu({
  balance,
  pendingOrders,
  lowStock,
  statsAttention = 0,
}: {
  balance: number;
  pendingOrders: number;
  lowStock: number;
  statsAttention?: number;
}) {
  const pathname = usePathname();
  const { dictionary } = useI18n();
  const t = dictionary.nav;
  const groups: { label: string; items: DrawerItem[] }[] = [
    { label: t.groups.essential, items: [
      { href: "/espace", label: t.items.home, icon: LayoutDashboard },
      { href: "/projets", label: t.items.projects, icon: Layers },
      { href: "/ma-page", label: t.items.storefront, icon: Store },
      { href: "/commandes", label: t.items.orders, icon: ShoppingBag, badge: "orders" },
      { href: "/offres/configurer", label: t.items.offers, icon: BadgePercent, activeRoot: "/offres" },
    ] },
    { label: t.groups.business, items: [
      { href: "/produits/configurer", label: t.items.products, icon: Boxes, badge: "stock", activeRoot: "/produits" },
      { href: "/agenda", label: t.items.agenda, icon: CalendarDays },
      { href: "/statistiques", label: t.items.stats, icon: ChartLine, badge: "stats" },
      { href: "/resultats", label: t.items.content, icon: FolderOpen },
      { href: "/installer", label: t.items.install, icon: Smartphone },
      { href: "/contexte/configurer", label: t.items.ai, icon: MessageSquareText, activeRoot: "/contexte" },
    ] },
    { label: t.groups.account, items: [
      { href: "/compte", label: t.items.viewProfile, icon: UserRound },
    ] },
  ];
  const drawerId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useAssistantMenuPresence("dashboard-mobile-navigation", open);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 980px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

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
        <span>{t.menu}</span>
      </button>

      <div
        className={`${styles.drawerLayer} ${open ? styles.drawerLayerOpen : ""}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={styles.drawerBackdrop}
          aria-label={t.close}
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />

        <aside
          id={drawerId}
          className={styles.mobileDrawer}
          role="dialog"
          aria-modal="true"
          aria-label={t.mainAria}
        >
          <div className={styles.drawerHeader}>
            <Link href="/espace" className={styles.drawerBrand} onClick={() => setOpen(false)}>
              <FluxBrand />
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              className={styles.drawerClose}
              aria-label={t.close}
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className={styles.drawerIdentity}>
            <FluxBrand className={styles.drawerAvatar} markOnly />
            <span>
              <strong>{t.workspace}</strong>
              <small>Wayne-Web Flux</small>
            </span>
          </div>

          <div className={styles.drawerScroll}>
            {groups.map((group) => (
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
                          : badge === "stats"
                            ? statsAttention
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
              <span><strong>{balance}</strong> {t.credits}</span>
              <ChevronRight aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
