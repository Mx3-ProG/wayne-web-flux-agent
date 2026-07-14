import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Gauge, ShieldCheck } from "lucide-react";
import styles from "./showroom.module.css";

export const metadata: Metadata = {
  title: "Maison Veyra — Leasing automobile d’exception",
  description: "Une vitrine de démonstration créée avec Wayne Web Flux.",
  robots: { index: false, follow: false },
};

const VEHICLES = [
  {
    name: "Lamborghini Urus",
    type: "SUV",
    engine: "V8",
    mileage: "25 000 km",
    price: "217 000 €",
    leasePrice: "10 000 €",
    image: "/demos/automobile-luxe/lamborghini-urus.jpg",
    alt: "Lamborghini Urus verte vue de trois quarts avant",
  },
  {
    name: "Aston Martin DB9",
    type: "Grand tourisme",
    engine: "V12",
    mileage: "45 000 km",
    price: "85 000 €",
    leasePrice: "3 500 €",
    image: "/demos/automobile-luxe/aston-martin-db9.jpg",
    alt: "Aston Martin DB9 grise vue de trois quarts avant",
  },
  {
    name: "Ferrari 488 GTB",
    type: "Supercar",
    engine: "670 ch",
    mileage: "55 000 km",
    price: "199 900 €",
    leasePrice: "9 500 €",
    image: "/demos/automobile-luxe/ferrari-488-gtb.jpg",
    alt: "Ferrari 488 GTB gris anthracite vue de trois quarts avant",
  },
];

export default function AutomobileLuxuryDemo() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <video
          className={styles.heroMedia}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/demos/automobile-luxe/hero-poster.jpg"
          aria-label="Coupé de luxe dans une ville à la tombée du jour"
        >
          <source src="/demos/automobile-luxe/hero-loop.mp4" type="video/mp4" />
        </video>
        <div className={styles.heroShade} />

        <header className={styles.header}>
          <Link className={styles.logo} href="/demo/automobile-luxe" aria-label="Maison Veyra, accueil">
            <span>V</span>
            <strong>MAISON VEYRA</strong>
          </Link>
          <nav aria-label="Navigation de la vitrine">
            <a href="#collection">La collection</a>
            <a href="#experience">L&apos;expérience</a>
          </nav>
          <a className={styles.headerCta} href="#contact">Être rappelé</a>
        </header>

        <div className={styles.heroContent}>
          <p>Leasing automobile d&apos;exception · Paris</p>
          <h1>Changez de voiture.<br /><em>Pas de standing.</em></h1>
          <span>Une sélection rare, une mensualité claire et un conseiller qui connaît votre temps.</span>
          <a className={styles.heroCta} href="#collection">
            Découvrir la collection <ArrowRight aria-hidden="true" />
          </a>
        </div>

        <div className={styles.heroFoot}>
          <span><i /> Disponibilité immédiate</span>
          <small>Paris · Lyon · Monaco</small>
          <span>À partir de 890 € / mois</span>
        </div>
      </section>

      <section className={styles.collection} id="collection">
        <div className={styles.sectionIntro}>
          <p>La sélection du moment</p>
          <h2>Trois tempéraments.<br /><em>Une même exigence.</em></h2>
          <span>Des véhicules configurés avec justesse, disponibles sans les délais habituels.</span>
        </div>
        <div className={styles.vehicleGrid} aria-label="Collection de véhicules, défilement horizontal">
          {VEHICLES.map((vehicle, index) => (
            <article key={vehicle.name} className={styles.vehicleCard}>
              <div className={styles.vehicleVisual} data-index={`0${index + 1}`}>
                <Image
                  src={vehicle.image}
                  alt={vehicle.alt}
                  fill
                  sizes="(max-width: 760px) 100vw, 33vw"
                  quality={82}
                />
              </div>
              <div className={styles.vehicleCopy}>
                <span>{vehicle.type}</span>
                <h3>{vehicle.name}</h3>
                <ul aria-label={`Caractéristiques de la ${vehicle.name}`}>
                  <li>{vehicle.engine}</li>
                  <li>{vehicle.mileage}</li>
                </ul>
                <div className={styles.vehiclePrice}>
                  <span><small>Leasing dès</small><strong>{vehicle.leasePrice}<em>/ mois</em></strong></span>
                  <span><small>Prix comptant</small><b>{vehicle.price}</b></span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.experience} id="experience">
        <div>
          <p>L&apos;expérience Veyra</p>
          <h2>Le luxe, c&apos;est aussi<br />de ne pas attendre.</h2>
        </div>
        <div className={styles.services}>
          <article><CalendarDays aria-hidden="true" /><strong>Livraison en 7 jours</strong><span>À domicile, partout en France.</span></article>
          <article><ShieldCheck aria-hidden="true" /><strong>Tout est inclus</strong><span>Entretien, garantie et assistance.</span></article>
          <article><Gauge aria-hidden="true" /><strong>Repartez quand vous voulez</strong><span>Changez de modèle sans friction.</span></article>
        </div>
      </section>

      <section className={styles.contact} id="contact">
        <p>Votre prochain départ commence ici.</p>
        <h2>Parlons de la voiture<br />qui vous ressemble.</h2>
        <a href="mailto:conciergerie@example.com">Parler à un conseiller <ArrowRight aria-hidden="true" /></a>
        <small>Vitrine de démonstration créée par FLUX</small>
      </section>
    </main>
  );
}
