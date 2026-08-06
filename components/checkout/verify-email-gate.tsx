"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LockKeyhole, MailWarning, Send } from "lucide-react";
import { resendVerificationEmail } from "@/app/(app)/actions";
import type { DashboardDict, BillingDict } from "@/lib/i18n/get-dictionary";
import styles from "./verify-email-gate.module.css";

// Le tunnel de paiement refuse les adresses non prouvées (voir
// app/api/checkout/session/route.ts) : on n'encaisse pas quelqu'un qu'on ne
// sait pas joindre. Cet écran remplace le formulaire Stripe dans ce cas.
//
// Il double le bandeau du dashboard parce que /checkout vit hors du groupe
// (app) : ni son layout, ni son I18nProvider ne s'appliquent ici. D'où les
// dictionnaires passés en props plutôt que lus par useI18n().
export function VerifyEmailGate({
  email,
  backHref,
  t,
  tCheckout,
}: {
  email: string | null;
  backHref: string;
  t: DashboardDict["emailVerification"];
  tCheckout: BillingDict["checkout"];
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  function translate(code: string): string {
    return t.errors[code as keyof typeof t.errors] ?? t.errors.unknown;
  }

  return (
    <div className={styles.page}>
      <header>
        <Link href={backHref}>← {tCheckout.back}</Link>
        <span>
          <LockKeyhole aria-hidden="true" /> {tCheckout.securePayment}
        </span>
      </header>
      <main className={styles.panel}>
        <div className={styles.icon}>
          <MailWarning aria-hidden="true" />
        </div>
        <p className={styles.eyebrow}>{tCheckout.creditsEyebrow}</p>
        <h1>{t.banner}</h1>
        {email && (
          <p className={styles.lead}>
            <span className={styles.address}>{email}</span>
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.resend}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await resendVerificationEmail();
                if (result.error) setFeedback({ ok: false, text: translate(result.error) });
                else if (result.message === "already_verified")
                  setFeedback({ ok: true, text: t.errors.already_verified });
                else setFeedback({ ok: true, text: `${t.sent} ${t.spamHint}` });
              })
            }
          >
            <Send aria-hidden="true" />
            {pending ? t.resending : t.resend}
          </button>
          <Link href={backHref} className={styles.secondary}>
            {tCheckout.back}
          </Link>
        </div>
        {feedback && (
          <p
            className={`${styles.feedback} ${feedback.ok ? styles.ok : styles.ko}`}
            role="status"
          >
            {feedback.text}
          </p>
        )}
        <p className={styles.hint}>{t.spamHint}</p>
      </main>
    </div>
  );
}
