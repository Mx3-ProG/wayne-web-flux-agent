"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { useState } from "react";
import styles from "./credits-link.module.css";

export function CreditsLink({
  balance,
  className,
}: {
  balance: number;
  className?: string;
}) {
  const [burst, setBurst] = useState(0);

  return (
    <Link
      href="/credits"
      className={`${styles.link} ${className ?? ""}`}
      aria-label={`${balance} crédits — voir mes crédits`}
      onClick={() => setBurst((value) => value + 1)}
    >
      <span
        key={burst}
        className={`${styles.coinScene} ${burst > 0 ? styles.coinSceneBurst : ""}`}
        aria-hidden="true"
      >
        <Coins className={styles.coinIcon} />
        <i className={`${styles.coinParticle} ${styles.coinParticleOne}`} />
        <i className={`${styles.coinParticle} ${styles.coinParticleTwo}`} />
        <i className={`${styles.coinParticle} ${styles.coinParticleThree}`} />
      </span>
      <span className={styles.balance}>{balance}</span>
    </Link>
  );
}