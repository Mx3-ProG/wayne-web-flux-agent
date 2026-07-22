"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Check, WandSparkles } from "lucide-react";
import { createAccount, type CreateAccountState } from "@/app/commencer/actions";
import { FluxBrand } from "@/components/flux-brand";
import { FluxStepCoach } from "@/components/assistant/flux-step-coach";
import styles from "@/app/commencer/tunnel.module.css";
import type { TunnelDict } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

const initialState: CreateAccountState = {};

// Écran 0 : le compte est créé AVANT les questions, pour que chaque réponse
// s'écrive directement en base. En cas de succès l'action redirige vers
// /commencer, qui se re-rend en mode connecté et enchaîne sur le Parcours.
export function AccountGate({ dict, locale }: { dict: TunnelDict; locale: Locale }) {
  const [state, formAction, pending] = useActionState(createAccount, initialState);
  const { accountGate: t, errors } = dict;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label={t.backHome}>
          <FluxBrand className={styles.brand} />
        </Link>
        <Link className={styles.accountLink} href="/login">
          {t.alreadyAccount}
        </Link>
      </header>

      <section className={styles.stage}>
        <div className={styles.claim}>
          <span className={styles.introIcon}>
            <WandSparkles aria-hidden="true" />
          </span>
          <p className={styles.kicker}>{t.kicker}</p>
          <h1>
            {t.titleLine1}
            <br />
            <em>{t.titleEm}</em>
          </h1>
          <p>{t.text}</p>

          <FluxStepCoach
            messageId="onboarding-account"
            errorMessageId="onboarding-account-error"
            hasError={Boolean(state.error)}
          />

          <form action={formAction}>
            <input type="hidden" name="locale" value={locale} />
            <label>
              <span>{t.nameLabel}</span>
              <input
                name="name"
                required
                maxLength={40}
                placeholder={t.namePlaceholder}
                autoComplete="given-name"
              />
            </label>
            <label>
              <span>{t.emailLabel}</span>
              <input
                name="email"
                type="email"
                required
                placeholder={t.emailPlaceholder}
                autoComplete="email"
              />
            </label>
            <label>
              <span>{t.passwordLabel}</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder={t.passwordPlaceholder}
                autoComplete="new-password"
              />
            </label>
            {state.error && <p className={styles.error}>{errors[state.error]}</p>}
            <button className={`flux-button-smooth ${styles.primary}`} type="submit" disabled={pending}>
              {pending ? t.submitting : t.submit}
              {!pending && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <div className={styles.valueList}>
            <span>
              <Check aria-hidden="true" /> {t.trialValue}
            </span>
            <span>
              <Check aria-hidden="true" /> {t.creditsValue}
            </span>
          </div>

          <small>
            {t.legalPrefix}{" "}
            <a href="/cgv" target="_blank" rel="noreferrer">
              {t.legalLink}
            </a>
            .
          </small>
        </div>
      </section>
    </main>
  );
}
