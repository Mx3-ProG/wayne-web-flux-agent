"use client";

// Bouton flottant « remonter en haut » (pages.scroll_top). Apparaît après un
// écran de défilement, coin bas gauche (le contact/panier occupent la droite).

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import styles from "./vitrine.module.css";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

export function ScrollTopButton({ label = frStorefront.shell.scrollTop }: { label?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      className={styles.scrollTopFab}
      aria-label={label}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp aria-hidden="true" />
    </button>
  );
}
