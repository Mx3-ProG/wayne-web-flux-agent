import Link from "next/link";
import { ArrowRight, CalendarClock, LayoutGrid, Sparkles, TrendingUp } from "lucide-react";
import { FluxBrand } from "@/components/flux-brand";
import styles from "./invitation.module.css";

export const metadata = {
  title: "Vous êtes invité — FLUX",
  description:
    "Un commerçant vous invite à découvrir FLUX : votre vitrine, vos commandes et votre agenda réunis au même endroit.",
};

const BENEFITS = [
  {
    icon: LayoutGrid,
    title: "Une vitrine en ligne, pas un site à gérer",
    text: "Vos produits, vos horaires, vos infos. En ligne en quelques minutes, sans technique.",
  },
  {
    icon: CalendarClock,
    title: "Commandes et rendez-vous au même endroit",
    text: "Fini le carnet, les SMS et les tableurs éparpillés. Tout arrive dans un seul espace.",
  },
  {
    icon: TrendingUp,
    title: "Votre chiffre d’affaires en un coup d’œil",
    text: "Ce qui rentre, ce qui reste à préparer, ce qui a marché ce mois-ci.",
  },
  {
    icon: Sparkles,
    title: "Vos contenus écrits pour vous",
    text: "Descriptions, annonces, réponses clients : FLUX rédige, vous validez.",
  },
];

export default function InvitationPage() {
  return (
    <main className={styles.page}>
      <FluxBrand className={styles.brand} priority />

      <section className={styles.card}>
        <p className={styles.kicker}>Vous êtes invité</p>
        <h1>
          Votre commerce mérite mieux
          <br />
          que <em>dix applis</em> éparpillées.
        </h1>
        <p className={styles.lead}>
          Un commerçant qui utilise FLUX a pensé que ça pourrait vous faire gagner
          un temps précieux. FLUX réunit votre vitrine, vos commandes, votre
          agenda et vos contenus dans un seul espace — une connexion, tout votre
          business sous les yeux.
        </p>

        <div className={styles.benefits}>
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <article className={styles.benefit} key={title}>
              <Icon aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            </article>
          ))}
        </div>

        <Link className={`flux-button-smooth ${styles.cta}`} href="/commencer">
          Créer ma vitrine en 2 minutes
          <ArrowRight aria-hidden="true" />
        </Link>
        <p className={styles.reassure}>
          7 jours d’essai offerts · Aucun engagement · Vos données restent les vôtres
        </p>

        <p className={styles.existing}>
          Vous avez déjà un compte ? <Link href="/login">Se connecter</Link>
        </p>
      </section>
    </main>
  );
}
