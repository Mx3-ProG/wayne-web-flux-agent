"use client";

import Link from "next/link";
import { LayoutDashboard, RefreshCw, TriangleAlert } from "lucide-react";
import styles from "./error-screen.module.css";

// Écran d'erreur commun : 404 (not-found.tsx) et erreurs runtime (error.tsx).
// Deux sorties : recharger la page, ou retourner au dashboard (/espace —
// redirige vers /login si l'utilisateur n'est pas connecté).
export function ErrorScreen() {
  return (
    <div className={styles.screen}>
      <span className={styles.icon}><TriangleAlert aria-hidden="true" /></span>
      <p className={styles.kicker}>Erreur</p>
      <h1>Oups.. Un problème est <em>survenu.</em></h1>
      <p className={styles.text}>Vous avez deux solutions :</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => window.location.reload()}
        >
          <RefreshCw aria-hidden="true" /> Recharger la page
        </button>
        <Link href="/espace" className={styles.secondary}>
          <LayoutDashboard aria-hidden="true" /> Aller au dashboard
        </Link>
      </div>
    </div>
  );
}
