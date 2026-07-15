"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { signIn, type AuthState } from "./actions";
import styles from "./login.module.css";
import { FluxBrand } from "@/components/flux-brand";
import { FluxRouteLoader } from "@/components/flux-route-loader";

const initialState: AuthState = {};

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(signIn, initialState);

  return (
    <main className={styles.page}>
      {loginPending && <FluxRouteLoader />}
      <Link className={styles.back} href="/"><ArrowLeft aria-hidden="true" /> Accueil</Link>
      <FluxBrand className={styles.brand} priority />

      <section className={styles.layout}>
        <div className={styles.pitch}>
          <p className={styles.kicker}>Ton espace de croissance</p>
          <h1>Reprends là où ton<br />commerce s&apos;est <em>arrêté.</em></h1>
          <p>
            Ta vitrine, tes contenus, tes prospects et ton agenda sont réunis.
            Une connexion, tout ton business sous les yeux.
          </p>
          <div className={styles.proofs}>
            <span><Check aria-hidden="true" /> Tes données restent les tiennes</span>
            <span><Check aria-hidden="true" /> Aucun engagement</span>
            <span><Check aria-hidden="true" /> Support Wayne Web</span>
          </div>
        </div>

        <div className={styles.auth}>
          <div className={styles.authHeading}>
            <span><Sparkles aria-hidden="true" /></span>
            <div><h2>Bon retour.</h2><p>Connecte-toi à ton espace Flux.</p></div>
          </div>
          <form action={loginAction}>
            <label>
              <span>Email</span>
              <div><Mail aria-hidden="true" /><input name="email" type="email" placeholder="ton@email.fr" required autoComplete="email" /></div>
            </label>
            <label>
              <span>Mot de passe</span>
              <div><LockKeyhole aria-hidden="true" /><input name="password" type="password" placeholder="••••••••" required autoComplete="current-password" /></div>
            </label>
            <Link className={styles.forgot} href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
            {loginState.error && <p className={styles.error}>{loginState.error}</p>}
            <button className={`flux-button-smooth ${styles.primary}`} type="submit" disabled={loginPending}>
              {loginPending ? "Connexion…" : "Entrer dans mon espace"}
              {!loginPending && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <div className={styles.divider}><span>ou</span></div>

          {/* La création de compte se fait désormais UNIQUEMENT dans le tunnel :
              c'est lui qui ouvre la session puis remplit l'espace au fur et à
              mesure. Un compte créé « à sec » ici repartait vide, ce qui était
              tout le problème. */}
          <div className={styles.create}>
            <p>Pas encore de compte ?</p>
            <Link className={styles.tunnelLink} href="/commencer">
              Configurer mon espace en 2 minutes <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
