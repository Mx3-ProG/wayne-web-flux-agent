"use client";

import { useEffect } from "react";
import type { PageEventKind } from "@/lib/types";

// Tracking léger de la vitrine publique. Monté uniquement dans VitrinePublic
// (jamais dans la préview de l'éditeur) :
//  - une visite par session de navigation (sessionStorage) ;
//  - clics sur téléphone / WhatsApp / réseaux, par délégation d'événement.
export function VitrineTracker({ slug, pageId }: { slug: string; pageId: string }) {
  useEffect(() => {
    const send = (kind: PageEventKind) => {
      const body = JSON.stringify({ slug, kind });
      try {
        if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
          fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {}
    };

    const viewKey = `ww_view_${pageId}`;
    try {
      if (!sessionStorage.getItem(viewKey)) {
        sessionStorage.setItem(viewKey, "1");
        send("view");
      }
    } catch {
      send("view");
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("a");
      if (!link) return;
      const track = link.getAttribute("data-track");
      if (track === "whatsapp") send("whatsapp_click");
      else if (track === "phone" || link.getAttribute("href")?.startsWith("tel:"))
        send("phone_click");
      else if (track === "social") send("social_click");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [slug, pageId]);

  return null;
}
