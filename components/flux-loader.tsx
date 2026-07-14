"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./flux-loader.module.css";

const MIN_SEQUENCE_MS = 700;
const MAX_SEQUENCE_MS = 5_000;
const STOREFRONT_SEQUENCE_MS = 900;

export function FluxLoader() {
  const pathname = usePathname();
  const [duration, setDuration] = useState(MAX_SEQUENCE_MS);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const storefront = pathname.startsWith("/p/");
    const elapsed = performance.now();
    const sequenceDuration = storefront
      ? STOREFRONT_SEQUENCE_MS
      : Math.min(MAX_SEQUENCE_MS, Math.max(MIN_SEQUENCE_MS, elapsed * 0.72));
    const frame = window.requestAnimationFrame(() => setDuration(sequenceDuration));

    let finishTimer: number | undefined;
    let removeTimer: number | undefined;
    let safetyTimer: number | undefined;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const remaining = storefront
        ? 0
        : Math.max(0, sequenceDuration - performance.now());
      finishTimer = window.setTimeout(() => {
        setLeaving(true);
        removeTimer = window.setTimeout(() => setVisible(false), 380);
      }, remaining);
    };

    if (storefront) {
      safetyTimer = window.setTimeout(finish, STOREFRONT_SEQUENCE_MS);
    } else {
      if (document.readyState === "complete") finish();
      else window.addEventListener("load", finish, { once: true });
      safetyTimer = window.setTimeout(finish, MAX_SEQUENCE_MS);
    }

    return () => {
      window.removeEventListener("load", finish);
      window.cancelAnimationFrame(frame);
      if (finishTimer) window.clearTimeout(finishTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
      if (safetyTimer) window.clearTimeout(safetyTimer);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className={`${styles.loader} ${leaving ? styles.leaving : ""}`}
      style={{ "--flux-load-duration": `${duration}ms` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.lockup}>
        <div className={styles.word}>
          <span className={styles.f}>F</span>
          <span className={styles.l}>L</span>
          <span className={styles.u}>U</span>
          <span className={styles.x}>X</span>
        </div>
        <Image
          className={styles.mark}
          src="/flux-symbol-light.png"
          width={887}
          height={590}
          sizes="72px"
          alt=""
          priority
        />
      </div>
    </div>
  );
}
