"use client";

// Mode sombre/clair choisi par le visiteur, persisté en localStorage et
// synchronisé entre composants (hero, shell…) via un événement custom.
// null = palette du thème (et snapshot SSR, appliqué jusqu'à l'hydratation).

import { useSyncExternalStore } from "react";

const MODE_KEY = "ww-vitrine-mode";
const MODE_EVENT = "ww-vitrine-mode-change";

function subscribeVisitorMode(callback: () => void) {
  window.addEventListener(MODE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MODE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function readVisitorMode(): "dark" | "light" | null {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

export function useVisitorMode(darkTheme: boolean) {
  const visitorMode = useSyncExternalStore(
    subscribeVisitorMode,
    readVisitorMode,
    () => null
  );
  const effectiveDark = visitorMode ? visitorMode === "dark" : darkTheme;
  const toggleMode = () => {
    try {
      localStorage.setItem(MODE_KEY, effectiveDark ? "light" : "dark");
      window.dispatchEvent(new Event(MODE_EVENT));
    } catch {}
  };
  // Fond/cartes personnalisés — ignorés quand le visiteur force un mode
  // opposé au thème (les variables inline gagneraient sur le CSS).
  const useCustomSurfaces = !visitorMode || (visitorMode === "dark") === darkTheme;
  return { visitorMode, effectiveDark, toggleMode, useCustomSurfaces };
}

export function isDarkTheme(theme: string): boolean {
  return ["studio", "luxe", "neon", "prestige", "performance-gt", "rosso-editorial"].includes(theme);
}
