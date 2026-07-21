"use client";

import { useEffect, useState } from "react";
import { Check, MoreVertical, Share, Smartphone } from "lucide-react";
import styles from "./installer.module.css";
import { useI18n } from "@/components/i18n-provider";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppGuide() {
  const { dictionary } = useI18n();
  const t = dictionary.installer;
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
            {installed ? t.installed : t.oneMinute}
          </strong>
          <small>
            {installed
              ? t.installedHint : t.chooseDevice}
          </small>
        </span>
        {installPrompt && !installed && (
          <button type="button" className={`flux-button-smooth ${styles.installButton}`} onClick={install}>
            {t.installNow}
          </button>
        )}
      </div>

      <div className={styles.guides}>
        <section className={styles.guide}>
          <div className={styles.guideHeading}>
            <span className={styles.platform}>{t.iphonePlatform}</span><h2>{t.fromSafari}</h2>
          </div>
          <ol>
            {t.iphoneSteps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{index === 1 && <Share aria-hidden="true" />}{step}</p></li>)}
          </ol>
        </section>

        <section className={styles.guide}>
          <div className={styles.guideHeading}>
            <span className={styles.platform}>{t.androidPlatform}</span><h2>{t.fromChrome}</h2>
          </div>
          <ol>
            {t.androidSteps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{index === 1 && <MoreVertical aria-hidden="true" />}{step}</p></li>)}
          </ol>
        </section>
      </div>
    </>
  );
}
