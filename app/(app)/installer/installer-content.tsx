"use client";

import { useI18n } from "@/components/i18n-provider";
import { InstallAppGuide } from "./install-app-guide";
import styles from "./installer.module.css";

export function InstallerContent() {
  const { dictionary } = useI18n();
  const t = dictionary.installer;
  return <div className={styles.page}>
    <p className={styles.eyebrow}>{t.eyebrow}</p><h1 className={styles.title}>{t.title}</h1><p className={styles.subtitle}>{t.subtitle}</p>
    <InstallAppGuide />
    <aside className={styles.note}><strong>{t.noteTitle}</strong><p>{t.note}</p></aside>
  </div>;
}
