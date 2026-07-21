"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Monitor, RefreshCw, Smartphone } from "lucide-react";
import styles from "@/app/home.module.css";
import type { LandingDict } from "@/lib/i18n/get-dictionary";

type PreviewMode = "desktop" | "mobile";

export function LiveSitePreview({ dict }: { dict: LandingDict["liveShowcase"] }) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = () => setReloadKey((key) => key + 1);

  return (
    <div className={`${styles.liveBrowser} ${mode === "mobile" ? styles.liveBrowserMobile : ""}`}>
      <div className={styles.liveBrowserBar}>
        <div className={styles.liveWindowDots} aria-hidden="true"><i /><i /><i /></div>
        <button className={styles.liveAddress} type="button" onClick={reload} title={dict.reloadTitle}>
          <RefreshCw aria-hidden="true" />
          <span>maison-veyra.flux.page</span>
        </button>
        <div className={styles.liveBrowserActions}>
          <div className={styles.previewSwitch} aria-label={dict.formatAria}>
            <button type="button" className={mode === "desktop" ? styles.previewSwitchActive : ""} onClick={() => setMode("desktop")} aria-pressed={mode === "desktop"} title={dict.desktopTitle}>
              <Monitor aria-hidden="true" /><span>{dict.desktop}</span>
            </button>
            <button type="button" className={mode === "mobile" ? styles.previewSwitchActive : ""} onClick={() => setMode("mobile")} aria-pressed={mode === "mobile"} title={dict.mobileTitle}>
              <Smartphone aria-hidden="true" /><span>{dict.mobile}</span>
            </button>
          </div>
          <Link href="/demo/automobile-luxe" target="_blank">
            {dict.open} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className={`${styles.liveViewport} ${mode === "mobile" ? styles.liveViewportMobile : styles.liveViewportDesktop}`}>
        <div className={styles.liveDeviceFrame}>
          <iframe
            key={reloadKey}
            src="/demo/automobile-luxe"
            title={dict.iframeTitle}
            loading="lazy"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
        <span className={styles.liveBadge}><i /> {dict.liveBadge}</span>
      </div>
    </div>
  );
}
