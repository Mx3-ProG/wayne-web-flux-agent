"use client";

// Header de navigation configurable (pages.navigation). Rendu à la place du
// bloc storeNav historique quand le commerçant a activé son menu : liens vers
// les pages internes, les ancres de sections et des URLs externes, options
// sticky / transparent / logo / bouton CTA, burger sur mobile.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Page } from "@/lib/types";
import { Menu, Moon, Sun, X } from "lucide-react";
import { isDarkTheme, useVisitorMode } from "./visitor-mode";
import { LanguageGlobe } from "./language-globe";
import styles from "./vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";
import type { Locale } from "@/lib/i18n/config";

type Props = {
  page: Page;
  // Path de la page courante ('' = accueil) : les ancres d'une sous-page
  // renvoient vers l'accueil, le lien actif est mis en évidence.
  currentPath: string;
  preview?: boolean;
  t?: StorefrontDict["header"];
  locale?: Locale;
  availableLocales?: Locale[];
};

export function VitrineHeader({
  page,
  currentPath,
  preview = false,
  t = frStorefront.header,
  locale,
  availableLocales,
}: Props) {
  const [open, setOpen] = useState(false);
  const { effectiveDark, toggleMode } = useVisitorMode(isDarkTheme(page.theme));
  const nav = page.navigation;
  if (!nav) return null;

  const base = `/p/${page.slug}`;
  const onHome = currentPath === "";

  function hrefOf(kind: "page" | "anchor" | "external", target: string): string {
    if (kind === "external") return target;
    if (kind === "anchor") return onHome ? target : `${base}${target}`;
    return target ? `${base}/${target}` : base;
  }

  function isActive(kind: string, target: string): boolean {
    return kind === "page" && target === currentPath;
  }

  const showLogo = nav.showLogo !== false;

  const links = (
    <>
      {nav.items.map((item) => {
        const href = hrefOf(item.kind, item.target);
        const className = isActive(item.kind, item.target)
          ? styles.navLinkActive
          : styles.navLink;
        if (preview || item.kind === "external") {
          return (
            <a
              key={item.id}
              className={className}
              href={preview ? undefined : href}
              target={item.kind === "external" ? "_blank" : undefined}
              rel={item.kind === "external" ? "noreferrer" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          );
        }
        if (item.kind === "anchor" && onHome) {
          return (
            <a
              key={item.id}
              className={className}
              href={href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          );
        }
        return (
          <Link
            key={item.id}
            className={className}
            href={href}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div
      className={`${styles.storeNav} ${styles.customNav} ${
        nav.sticky ? styles.navSticky : ""
      } ${nav.transparent ? styles.navTransparent : ""}`}
    >
      <span className={styles.storeNavName}>
        {showLogo &&
          (page.logo_url ? (
            <Image src={page.logo_url} alt="" width={34} height={34} />
          ) : (
            <i>{(page.business_name || "M").charAt(0).toUpperCase()}</i>
          ))}
        <b>{page.business_name || t.defaultBusinessName}</b>
      </span>

      <nav className={styles.navLinks} aria-label={t.navAria}>
        {links}
      </nav>

      <span className={styles.storeNavActions}>
        {!preview && locale && availableLocales && (
          <LanguageGlobe
            slug={page.slug}
            currentPath={currentPath}
            locale={locale}
            availableLocales={availableLocales}
          />
        )}
        <button
          type="button"
          className={styles.modeToggle}
          onClick={toggleMode}
          aria-label={effectiveDark ? t.lightMode : t.darkMode}
        >
          {effectiveDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        {nav.cta?.label && (
          <a href={preview ? undefined : hrefOf("anchor", nav.cta.target)}>
            {nav.cta.label}
          </a>
        )}
        <button
          type="button"
          className={`${styles.modeToggle} ${styles.navBurger}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t.closeMenu : t.openMenu}
          aria-expanded={open}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </span>

      {open && (
        <nav className={styles.navMobile} aria-label={t.navAria}>
          {links}
        </nav>
      )}
    </div>
  );
}
