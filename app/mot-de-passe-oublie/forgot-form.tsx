"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, KeyRound } from "lucide-react";
import { requestPasswordReset, type ResetState } from "./actions";
import styles from "../login/login.module.css";
import { FluxBrand } from "@/components/flux-brand";
import { localeHref, type Locale } from "@/lib/i18n/config";
import type { AuthDict } from "@/lib/i18n/get-dictionary";

const initialState: ResetState = {};

export function ForgotForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: AuthDict["forgot"];
}) {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <main className={styles.page}>
      <Link className={styles.back} href={localeHref(locale, "/login")}>
        <ArrowLeft aria-hidden="true" /> {dict.backLogin}
      </Link>
      <FluxBrand className={styles.brand} priority />

      <div className={styles.auth} style={{ width: "min(460px, 100%)" }}>
        <div className={styles.authHeading}>
          <span>
            <KeyRound aria-hidden="true" />
          </span>
          <div>
            <h2>{dict.title}</h2>
            <p>{dict.text}</p>
          </div>
        </div>
        <form action={action}>
          <label>
            <span>{dict.email}</span>
            <div>
              <Mail aria-hidden="true" />
              <input
                name="email"
                type="email"
                placeholder={dict.emailPlaceholder}
                required
                autoComplete="email"
              />
            </div>
          </label>
          {state.error && <p className={styles.error}>{state.error}</p>}
          {state.message && <p className={styles.success}>{state.message}</p>}
          <button className={`flux-button-smooth ${styles.primary}`} type="submit" disabled={pending}>
            {pending ? dict.submitting : dict.submit}
            {!pending && <ArrowRight aria-hidden="true" />}
          </button>
        </form>
      </div>
    </main>
  );
}
