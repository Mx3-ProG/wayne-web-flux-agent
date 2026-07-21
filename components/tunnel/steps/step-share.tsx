"use client";

import { useEffect, useState } from "react";
import { Copy, Check, MoreVertical, Share2, Smartphone } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Étape 8 : le lien réel de la vitrine. Copier vaut validation de l'étape —
// c'est le geste qu'on cherche à provoquer. L'installation PWA est fusionnée
// ici : elle ne méritait pas un écran à elle seule, mais elle a du sens au
// moment où l'on parle de garder son lien à portée de main.
export function StepShare({
  dict,
  pageUrl,
  gain,
  onShared,
}: {
  dict: TunnelDict["share"];
  pageUrl: string | null;
  gain: string;
  onShared: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  async function copy() {
    if (!pageUrl) return;
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    onShared();
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <Question
      kicker={dict.kicker}
      title={<>{dict.titleStart} <em>{dict.titleEm}</em></>}
      subtitle={dict.subtitle}
      gain={gain}
    >
      {pageUrl && (
        <>
          <div className={styles.shareLink}>
            <code>{pageUrl}</code>
            <button type="button" onClick={copy} className={styles.copyBtn}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? dict.copied : dict.copy}
            </button>
          </div>
          <div className={styles.shareRow}>
            <a
              className={styles.shareAction}
              href={`https://wa.me/?text=${encodeURIComponent(dict.whatsappText.replace("{url}", pageUrl))}`}
              target="_blank"
              rel="noreferrer"
              onClick={onShared}
            >
              {dict.whatsappShare}
            </a>
          </div>
        </>
      )}

      <div className={styles.installGuides}>
        <article>
          <strong>
            <Smartphone aria-hidden="true" /> {dict.iosTitle}
          </strong>
          <span>
            <Share2 aria-hidden="true" /> {dict.iosStep1}
          </span>
          <span>{dict.iosStep2}</span>
        </article>
        <article>
          <strong>
            <Smartphone aria-hidden="true" /> {dict.androidTitle}
          </strong>
          <span>
            <MoreVertical aria-hidden="true" /> {dict.androidStep1}
          </span>
          <span>{dict.androidStep2}</span>
        </article>
      </div>

      {installPrompt && (
        <button className={`flux-button-smooth ${styles.installNow}`} type="button" onClick={install}>
          {dict.installNow}
        </button>
      )}
    </Question>
  );
}
