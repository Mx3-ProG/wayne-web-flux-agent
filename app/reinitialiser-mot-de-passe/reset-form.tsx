"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, KeyRound } from "lucide-react";
import { updatePassword, type UpdatePasswordState } from "./actions";
import styles from "../login/login.module.css";
import { FluxBrand } from "@/components/flux-brand";
import { localeHref, type Locale } from "@/lib/i18n/config";
import type { AuthDict } from "@/lib/i18n/get-dictionary";

const initialState: UpdatePasswordState = {};

export function ResetForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: AuthDict["reset"];
}) {
  const [state, action, pending] = useActionState(updatePassword, initialState);

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
            <span>{dict.password}</span>
            <div>
              <LockKeyhole aria-hidden="true" />
              <input
                name="password"
                type="password"
                placeholder={dict.passwordPlaceholder}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </label>
          <label>
            <span>{dict.passwordConfirm}</span>
            <div>
              <LockKeyhole aria-hidden="true" />
              <input
                name="confirm"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </label>
          {state.error && <p className={styles.error}>{state.error}</p>}
          <button className={`flux-button-smooth ${styles.primary}`} type="submit" disabled={pending}>
            {pending ? dict.submitting : dict.submit}
            {!pending && <ArrowRight aria-hidden="true" />}
          </button>
        </form>
      </div>
    </main>
  );
}
