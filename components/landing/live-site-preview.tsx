"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Monitor, RefreshCw, Smartphone } from "lucide-react";
import styles from "@/app/home.module.css";

type PreviewMode = "desktop" | "mobile";

export function LiveSitePreview() {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 720px)").matches) setMode("mobile");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const reload = () => setReloadKey((key) => key + 1);

  return (
    <div className={`${styles.liveBrowser} ${mode === "mobile" ? styles.liveBrowserMobile : ""}`}>
      <div className={styles.liveBrowserBar}>
        <div className={styles.liveWindowDots} aria-hidden="true"><i /><i /><i /></div>
        <button className={styles.liveAddress} type="button" onClick={reload} title="Recharger la preview">
          <RefreshCw aria-hidden="true" />
          <span>maison-veyra.flux.page</span>
        </button>
        <div className={styles.liveBrowserActions}>
          <div className={styles.previewSwitch} aria-label="Format de la preview">
            <button type="button" className={mode === "desktop" ? styles.previewSwitchActive : ""} onClick={() => setMode("desktop")} aria-pressed={mode === "desktop"} title="Vue ordinateur">
              <Monitor aria-hidden="true" /><span>Desktop</span>
            </button>
            <button type="button" className={mode === "mobile" ? styles.previewSwitchActive : ""} onClick={() => setMode("mobile")} aria-pressed={mode === "mobile"} title="Vue mobile">
              <Smartphone aria-hidden="true" /><span>Mobile</span>
            </button>
          </div>
          <Link href="/demo/automobile-luxe" target="_blank">
            Ouvrir <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className={`${styles.liveViewport} ${mode === "mobile" ? styles.liveViewportMobile : styles.liveViewportDesktop}`}>
        <div className={styles.liveDeviceFrame}>
          <iframe
            key={reloadKey}
            src="/demo/automobile-luxe"
            title={`Preview ${mode} du site Maison Veyra créé avec Flux`}
            loading="lazy"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
        <span className={styles.liveBadge}><i /> En direct</span>
      </div>
    </div>
  );
}
