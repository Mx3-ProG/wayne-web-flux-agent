"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Check, WandSparkles } from "lucide-react";
import { createAccount, type TunnelActionState } from "@/app/commencer/actions";
import { FluxBrand } from "@/components/flux-brand";
import styles from "@/app/commencer/tunnel.module.css";

const initialState: TunnelActionState = {};

// Écran 0 : le compte est créé AVANT les questions, pour que chaque réponse
// s'écrive directement en base. En cas de succès l'action redirige vers
// /commencer, qui se re-rend en mode connecté et enchaîne sur le Parcours.
export function AccountGate() {
  const [state, formAction, pending] = useActionState(createAccount, initialState);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Retour à l'accueil">
          <FluxBrand className={styles.brand} />
        </Link>
        <Link className={styles.accountLink} href="/login">
          J&apos;ai déjà un compte
        </Link>
      </header>

      <section className={styles.stage}>
        <div className={styles.claim}>
          <span className={styles.introIcon}>
            <WandSparkles aria-hidden="true" />
          </span>
          <p className={styles.kicker}>Configuration personnalisée</p>
          <h1>
            On va construire ton
            <br />
            <em>moteur de croissance.</em>
          </h1>
          <p>
            Crée ton accès, puis réponds à quelques questions. Tout ce que tu
            diras sera appliqué à ton espace au fur et à mesure — rien ne se
            perd en route.
          </p>

          <form action={formAction}>
            <label>
              <span>Ton prénom</span>
              <input name="name" required maxLength={40} placeholder="Alex" autoComplete="given-name" />
            </label>
            <label>
              <span>Ton email professionnel</span>
              <input
                name="email"
                type="email"
                required
                placeholder="alex@moncommerce.fr"
                autoComplete="email"
              />
            </label>
            <label>
              <span>Choisis un mot de passe</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="8 caractères minimum"
                autoComplete="new-password"
              />
            </label>
            {state.error && <p className={styles.error}>{state.error}</p>}
            <button className={`flux-button-smooth ${styles.primary}`} type="submit" disabled={pending}>
              {pending ? "Création de ton espace…" : "Créer mon espace"}
              {!pending && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <div className={styles.valueList}>
            <span>
              <Check aria-hidden="true" /> 7 jours d&apos;essai, sans carte bancaire
            </span>
            <span>
              <Check aria-hidden="true" /> 100 crédits offerts au démarrage
            </span>
          </div>

          <small>
            En créant ton espace, tu confirmes avoir lu et accepté nos{" "}
            <a href="/cgv" target="_blank" rel="noreferrer">
              conditions générales d&apos;utilisation
            </a>
            .
          </small>
        </div>
      </section>
    </main>
  );
}
