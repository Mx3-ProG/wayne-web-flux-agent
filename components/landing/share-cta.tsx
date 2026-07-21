"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import styles from "@/app/home.module.css";

// "Partage Flux autour de toi" : Web Share API quand elle existe
// (mobile), sinon copie du lien dans le presse-papiers.
export function ShareCta({
  idleLabel,
  copiedLabel,
  shareText,
}: {
  idleLabel: string;
  copiedLabel: string;
  shareText: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.origin;
    const payload = {
      title: "Wayne Web Flux",
      text: shareText,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // partage annulé : on ne force rien
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // presse-papiers indisponible : rien à faire
    }
  }

  return (
    <button type="button" className={styles.shareCta} onClick={handleShare}>
      {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
      {copied ? copiedLabel : idleLabel}
    </button>
  );
}
