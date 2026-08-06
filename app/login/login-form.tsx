"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { signIn, type AuthState } from "./actions";
import styles from "./login.module.css";
import { FluxBrand } from "@/components/flux-brand";
import { FluxRouteLoader } from "@/components/flux-route-loader";
import { localeHref, type Locale } from "@/lib/i18n/config";
import type { AuthDict } from "@/lib/i18n/get-dictionary";
import { FluxStepCoach } from "@/components/assistant/flux-step-coach";

const initialState: AuthState = {};

export function LoginForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: AuthDict["login"];
}) {
  const [loginState, loginAction, loginPending] = useActionState(signIn, initialState);
  const href = (path: string) => localeHref(locale, path);

  return (
    <main className={styles.page}>
      {loginPending && <FluxRouteLoader />}
      <Link className={styles.back} href={href("/")}><ArrowLeft aria-hidden="true" /> {dict.backHome}</Link>
      <FluxBrand className={styles.brand} priority />

      <section className={styles.layout}>
        <div className={styles.pitch}>
          <p className={styles.kicker}>{dict.kicker}</p>
          <h1>{dict.titleLine1}<br />{dict.titleLine2} <em>{dict.titleEm}</em></h1>
          <p>{dict.text}</p>
          <div className={styles.proofs}>
            <span><Check aria-hidden="true" /> {dict.proof1}</span>
            <span><Check aria-hidden="true" /> {dict.proof2}</span>
            <span><Check aria-hidden="true" /> {dict.proof3}</span>
          </div>
        </div>

        <div className={styles.auth}>
          <div className={styles.authHeading}>
            <span><Sparkles aria-hidden="true" /></span>
            <div><h2>{dict.welcome}</h2><p>{dict.welcomeText}</p></div>
          </div>
          <FluxStepCoach
            messageId="marketing-login"
            errorMessageId="marketing-login-error"
            hasError={Boolean(loginState.error)}
          />
          <form action={loginAction}>
            <label>
              <span>{dict.email}</span>
              <div><Mail aria-hidden="true" /><input name="email" type="email" placeholder={dict.emailPlaceholder} required autoComplete="email" /></div>
            </label>
            <label>
              <span>{dict.password}</span>
              <div><LockKeyhole aria-hidden="true" /><input name="password" type="password" placeholder="••••••••" required autoComplete="current-password" /></div>
            </label>
            <Link className={styles.forgot} href={href("/mot-de-passe-oublie")}>{dict.forgot}</Link>
            {loginState.error && (
              <p className={styles.error}>
                {dict.errors[loginState.error as keyof typeof dict.errors] ??
                  dict.errors.unknown}
              </p>
            )}
            <button className={`flux-button-smooth ${styles.primary}`} type="submit" disabled={loginPending}>
              {loginPending ? dict.submitting : dict.submit}
              {!loginPending && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <div className={styles.divider}><span>{dict.or}</span></div>

          {/* La création de compte se fait désormais UNIQUEMENT dans le tunnel :
              c'est lui qui ouvre la session puis remplit l'espace au fur et à
              mesure. Un compte créé « à sec » ici repartait vide, ce qui était
              tout le problème. */}
          <div className={styles.create}>
            <p>{dict.noAccount}</p>
            <Link className={styles.tunnelLink} href="/commencer">
              {dict.tunnelCta} <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
