"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, KeyRound } from "lucide-react";
import { requestPasswordReset, type ResetState } from "./actions";
import styles from "../login/login.module.css";
import { FluxBrand } from "@/components/flux-brand";

const initialState: ResetState = {};

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/login">
        <ArrowLeft aria-hidden="true" /> Connexion
      </Link>
      <FluxBrand className={styles.brand} priority />

      <div className={styles.auth} style={{ width: "min(460px, 100%)" }}>
        <div className={styles.authHeading}>
          <span>
            <KeyRound aria-hidden="true" />
          </span>
          <div>
            <h2>Mot de passe oublié</h2>
            <p>On t’envoie un lien pour en choisir un nouveau.</p>
          </div>
        </div>
        <form action={action}>
          <label>
            <span>Email</span>
            <div>
              <Mail aria-hidden="true" />
              <input
                name="email"
                type="email"
                placeholder="ton@email.fr"
                required
                autoComplete="email"
              />
            </div>
          </label>
          {state.error && <p className={styles.error}>{state.error}</p>}
          {state.message && <p className={styles.success}>{state.message}</p>}
          <button className={`flux-button-smooth ${styles.primary}`} type="submit" disabled={pending}>
            {pending ? "Envoi…" : "Envoyer le lien"}
            {!pending && <ArrowRight aria-hidden="true" />}
          </button>
        </form>
      </div>
    </main>
  );
}
