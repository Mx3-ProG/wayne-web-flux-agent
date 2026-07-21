"use client";

import { Globe2 } from "lucide-react";
import { DashboardLanguageSwitcher } from "@/components/dashboard-language-switcher";
import { ACCOUNT_LANGUAGE_CHANGE_COST } from "@/lib/plans";
import { useI18n } from "@/components/i18n-provider";
import styles from "@/app/(app)/compte/compte.module.css";

export function AccountLanguageSettings() {
  const { dictionary, languageChangeFree } = useI18n();
  return (
    <section className={styles.languageCard}>
      <span className={styles.sectionIcon}><Globe2 aria-hidden="true" /></span>
      <div>
        <h2>{dictionary.language.title}</h2>
        <p>{dictionary.language.description}</p>
        <small>
          {languageChangeFree
            ? dictionary.language.firstChoice
            : dictionary.language.laterChangeCost.replace(
                "{cost}",
                String(ACCOUNT_LANGUAGE_CHANGE_COST)
              )}
        </small>
      </div>
      <DashboardLanguageSwitcher />
    </section>
  );
}
