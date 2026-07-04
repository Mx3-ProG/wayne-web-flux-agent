"use client";

import { useEffect, useState } from "react";
import { Check, MoreVertical, Share, Smartphone } from "lucide-react";
import styles from "./installer.module.css";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppGuide() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const frame = window.requestAnimationFrame(() => setInstalled(standalone));

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  return (
    <>
      <div className={styles.status}>
        <span className={styles.statusIcon}>
          {installed ? <Check aria-hidden="true" /> : <Smartphone aria-hidden="true" />}
        </span>
        <span>
          <strong>
            {installed ? "L’application est installée" : "Installation en une minute"}
          </strong>
          <small>
            {installed
              ? "Tu peux la retrouver sur ton écran d’accueil."
              : "Choisis les étapes correspondant à ton téléphone."}
          </small>
        </span>
        {installPrompt && !installed && (
          <button type="button" className={styles.installButton} onClick={install}>
            Installer maintenant
          </button>
        )}
      </div>

      <div className={styles.guides}>
        <section className={styles.guide}>
          <div className={styles.guideHeading}>
            <span className={styles.platform}>iPhone · Safari</span>
            <h2>Depuis Safari</h2>
          </div>
          <ol>
            <li><span>1</span><p>Ouvre cette page dans <strong>Safari</strong>.</p></li>
            <li><span>2</span><p>Appuie sur <Share aria-hidden="true" /> <strong>Partager</strong>.</p></li>
            <li><span>3</span><p>Choisis <strong>Sur l’écran d’accueil</strong>, puis « Ajouter ».</p></li>
          </ol>
        </section>

        <section className={styles.guide}>
          <div className={styles.guideHeading}>
            <span className={styles.platform}>Android · Chrome</span>
            <h2>Depuis Chrome</h2>
          </div>
          <ol>
            <li><span>1</span><p>Ouvre cette page dans <strong>Chrome</strong>.</p></li>
            <li><span>2</span><p>Appuie sur <MoreVertical aria-hidden="true" /> en haut à droite.</p></li>
            <li><span>3</span><p>Choisis <strong>Installer l’application</strong> ou « Ajouter à l’écran d’accueil ».</p></li>
          </ol>
        </section>
      </div>
    </>
  );
}
