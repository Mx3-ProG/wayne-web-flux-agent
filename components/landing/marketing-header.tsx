"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FluxBrand } from "@/components/flux-brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/i18n/config";
import styles from "./marketing-header.module.css";
import { useAssistantMenuPresence } from "@/components/assistant/use-assistant-menu-presence";

type NavLabels = {
  solution: string;
  tools: string;
  pricing: string;
  story: string;
  reviews: string;
  faq: string;
  contact: string;
  login: string;
  tryFree: string;
};

const MENU_COPY: Record<Locale, { open: string; close: string; explore: string }> = {
  fr: { open: "Ouvrir le menu", close: "Fermer le menu", explore: "Explorer FLUX" },
  en: { open: "Open menu", close: "Close menu", explore: "Explore FLUX" },
  es: { open: "Abrir el menú", close: "Cerrar el menú", explore: "Explorar FLUX" },
  de: { open: "Menü öffnen", close: "Menü schließen", explore: "FLUX entdecken" },
  it: { open: "Apri il menu", close: "Chiudi il menu", explore: "Scopri FLUX" },
  ru: { open: "Открыть меню", close: "Закрыть меню", explore: "Навигация FLUX" },
  zh: { open: "打开菜单", close: "关闭菜单", explore: "探索 FLUX" },
  ja: { open: "メニューを開く", close: "メニューを閉じる", explore: "FLUX を見る" },
  ar: { open: "فتح القائمة", close: "إغلاق القائمة", explore: "استكشف FLUX" },
};

export function MarketingHeader({
  locale,
  homeHref,
  pricingHref,
  loginHref,
  homeAria,
  navAria,
  languageAria,
  labels,
}: {
  locale: Locale;
  homeHref: string;
  pricingHref: string;
  loginHref: string;
  homeAria: string;
  navAria: string;
  languageAria: string;
  labels: NavLabels;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  useAssistantMenuPresence("marketing-navigation", menuOpen);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const copy = MENU_COPY[locale];
  const navItems = [
    { href: "#solution", label: labels.solution },
    { href: "#outils", label: labels.tools },
    { href: pricingHref, label: labels.pricing },
    { href: "#histoire", label: labels.story },
    { href: "#avis", label: labels.reviews },
    { href: "#faq", label: labels.faq },
    { href: "#contact", label: labels.contact },
  ];

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.nav}>
        <Link className={styles.brandLink} href={homeHref} aria-label={homeAria}>
          <FluxBrand className={styles.brand} priority />
        </Link>
        <button
          ref={menuButtonRef}
          className={styles.menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="marketing-menu"
          aria-label={menuOpen ? copy.close : copy.open}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div className={styles.menuBackdrop} onMouseDown={closeMenu}>
          <nav
            id="marketing-menu"
            className={styles.mobileMenu}
            aria-label={navAria}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className={styles.mobileMenuLabel}>{copy.explore}</p>
            <div className={styles.mobileMenuLinks}>
              {navItems.map((item, index) => (
                <Link
                  key={item.href}
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={item.href}
                  onClick={closeMenu}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className={styles.mobileMenuUtilities}>
              <LanguageSwitcher locale={locale} ariaLabel={languageAria} />
            </div>
            <div className={styles.mobileMenuActions}>
              <Link href={loginHref} onClick={closeMenu}>{labels.login}</Link>
              <Link className={`flux-button-smooth ${styles.mobileMenuCta}`} href="/commencer" onClick={closeMenu}>
                {labels.tryFree}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
