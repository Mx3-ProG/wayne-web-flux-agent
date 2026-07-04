"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  Store,
} from "lucide-react";
import styles from "@/app/(app)/app-shell.module.css";

const ITEMS = [
  { href: "/espace", label: "Accueil", icon: LayoutDashboard },
  { href: "/ma-page", label: "Vitrine", icon: Store },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/resultats", label: "Contenus", icon: FolderOpen },
];

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className={mobile ? styles.mobileNav : styles.sidebarNav}
      aria-label={mobile ? "Navigation mobile" : "Navigation principale"}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            href={href}
            key={href}
            className={active ? styles.navLinkActive : styles.navLink}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
