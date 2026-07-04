"use client";

import { useCallback, useEffect } from "react";

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

async function applyBadge(count: number) {
  const badgeNavigator = navigator as BadgeNavigator;

  try {
    if (count > 0) {
      await badgeNavigator.setAppBadge?.(count);
    } else {
      await badgeNavigator.clearAppBadge?.();
    }
  } catch {
    // Le badge est une amélioration progressive : certains navigateurs
    // l'ignorent ou le refusent quand l'app n'est pas installée.
  }
}

export function AppBadgeSync({ pendingOrders }: { pendingOrders: number }) {
  const refreshBadge = useCallback(async () => {
    try {
      const response = await fetch("/api/orders/pending-count", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { count?: number };
      await applyBadge(Math.max(0, data.count ?? 0));
    } catch {
      // Une perte de réseau ne doit jamais gêner l'utilisation du dashboard.
    }
  }, []);

  useEffect(() => {
    void applyBadge(pendingOrders);
  }, [pendingOrders]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshBadge();
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshBadge();
    }, 60_000);

    window.addEventListener("focus", refreshBadge);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshBadge);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshBadge]);

  return null;
}
