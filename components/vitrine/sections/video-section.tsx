"use client";

import styles from "../vitrine.module.css";
import type { StorefrontDict } from "@/lib/i18n/get-dictionary";
import frStorefront from "@/lib/i18n/dictionaries/fr/storefront.json";

type Props = {
  url: string;
  first?: boolean;
  t?: StorefrontDict["sections"]["video"];
};

// Renvoie l'URL d'embed pour YouTube/Vimeo, ou null si c'est un fichier direct.
function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/shorts\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoSection({ url, first = false, t = frStorefront.sections.video }: Props) {
  if (!url.trim()) return null;
  const embed = embedUrl(url.trim());
  return (
    <div className={`${styles.contentSection} ${first ? styles.firstInGroup : ""}`}>
      <div className={styles.videoEmbed}>
        {embed ? (
          <iframe
            src={embed}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={t.title}
          />
        ) : (
          <video src={url.trim()} controls playsInline preload="metadata" />
        )}
      </div>
    </div>
  );
}
