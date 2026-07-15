"use client";

import { useEffect, useState } from "react";
import { Copy, Check, MoreVertical, Share2, Smartphone } from "lucide-react";
import { Question } from "@/components/tunnel/question";
import styles from "@/app/commencer/tunnel.module.css";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Étape 8 : le lien réel de la vitrine. Copier vaut validation de l'étape —
// c'est le geste qu'on cherche à provoquer. L'installation PWA est fusionnée
// ici : elle ne méritait pas un écran à elle seule, mais elle a du sens au
// moment où l'on parle de garder son lien à portée de main.
export function StepShare({
  pageUrl,
  gain,
  onShared,
}: {
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
      kicker="Étape 8 · Ton lien"
      title={<>Fais-le <em>circuler.</em></>}
      subtitle="Bio Instagram, statut WhatsApp, fiche Google, signature d'email. C'est l'étape que tout le monde saute — et celle qui remplit un agenda."
      gain={gain}
    >
      {pageUrl && (
        <>
          <div className={styles.shareLink}>
            <code>{pageUrl}</code>
            <button type="button" onClick={copy} className={styles.copyBtn}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <div className={styles.shareRow}>
            <a
              className={styles.shareAction}
              href={`https://wa.me/?text=${encodeURIComponent(`Réserve en ligne : ${pageUrl}`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={onShared}
            >
              Partager sur WhatsApp
            </a>
          </div>
        </>
      )}

      <div className={styles.installGuides}>
        <article>
          <strong>
            <Smartphone aria-hidden="true" /> Sur iPhone
          </strong>
          <span>
            <Share2 aria-hidden="true" /> Dans Safari, touche « Partager »
          </span>
          <span>Choisis « Sur l&apos;écran d&apos;accueil »</span>
        </article>
        <article>
          <strong>
            <Smartphone aria-hidden="true" /> Sur Android
          </strong>
          <span>
            <MoreVertical aria-hidden="true" /> Ouvre le menu Chrome
          </span>
          <span>Choisis « Installer l&apos;application »</span>
        </article>
      </div>

      {installPrompt && (
        <button className={`flux-button-smooth ${styles.installNow}`} type="button" onClick={install}>
          Installer FLUX maintenant
        </button>
      )}
    </Question>
  );
}
