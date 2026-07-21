"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import styles from "./credits-link.module.css";

export function CreditsLink({
  balance,
  className,
}: {
  balance: number;
  className?: string;
}) {
  const { dictionary } = useI18n();
  const [burst, setBurst] = useState(0);

  return (
    <Link
      href="/credits"
      className={`${styles.link} ${className ?? ""}`}
      aria-label={dictionary.creditsLink.aria.replace("{credits}", String(balance))}
      onClick={() => setBurst((value) => value + 1)}
    >
      <span
        key={burst}
        data-credit-coins
        className={`${styles.coinScene} ${burst > 0 ? styles.coinSceneBurst : ""}`}
        aria-hidden="true"
      >
        <span className={styles.coinStack}>
          <i className={`${styles.coin} ${styles.coinBack}`} />
          <i className={`${styles.coin} ${styles.coinMiddle}`} />
          <i className={`${styles.coin} ${styles.coinFront}`}>
            <b className={styles.coinMark} />
          </i>
        </span>
        <i className={`${styles.spark} ${styles.sparkOne}`} />
        <i className={`${styles.spark} ${styles.sparkTwo}`} />
        <i className={`${styles.coinParticle} ${styles.coinParticleOne}`} />
        <i className={`${styles.coinParticle} ${styles.coinParticleTwo}`} />
        <i className={`${styles.coinParticle} ${styles.coinParticleThree}`} />
      </span>
      <span className={styles.balance}>{balance}</span>
    </Link>
  );
}
