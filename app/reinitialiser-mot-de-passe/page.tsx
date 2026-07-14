"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, KeyRound } from "lucide-react";
import { updatePassword, type UpdatePasswordState } from "./actions";
import styles from "../login/login.module.css";
import { FluxBrand } from "@/components/flux-brand";

const initialState: UpdatePasswordState = {};

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

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
            <h2>Nouveau mot de passe</h2>
            <p>Choisis un mot de passe pour ton espace Flux.</p>
          </div>
        </div>
        <form action={action}>
          <label>
            <span>Nouveau mot de passe</span>
            <div>
              <LockKeyhole aria-hidden="true" />
              <input
                name="password"
                type="password"
                placeholder="8 caractères minimum"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </label>
          <label>
            <span>Confirme le mot de passe</span>
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
          <button className={styles.primary} type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Mettre à jour"}
            {!pending && <ArrowRight aria-hidden="true" />}
          </button>
        </form>
      </div>
    </main>
  );
}
