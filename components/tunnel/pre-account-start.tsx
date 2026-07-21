"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { localeHref, type Locale } from "@/lib/i18n/config";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import { StepProductionLocale } from "@/components/tunnel/steps/step-production-locale";
import { AccountGate } from "@/components/tunnel/account-gate";
import styles from "@/app/commencer/tunnel.module.css";

export function PreAccountStart({ locale, dict }: { locale: Locale; dict: TunnelDict }) {
  const [identification, setIdentification] = useState(false);

  if (identification) return <AccountGate dict={dict} locale={locale} />;

  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <StepProductionLocale
          value={locale}
          onChange={(target) => {
            window.location.assign(localeHref(target, "/commencer"));
          }}
        />
      </section>
      <footer className={styles.controls}>
        <span />
        <button className={`flux-button-smooth ${styles.primary}`} type="button" onClick={() => setIdentification(true)}>
          {dict.footer.continue} <ArrowRight aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
