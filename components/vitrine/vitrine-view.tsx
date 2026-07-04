"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Page, Service, ServiceFamily } from "@/lib/types";
import { formatDuration, formatPrice } from "@/lib/types";
import { getFont } from "@/lib/verticals";
import { defaultLegal } from "@/lib/legal";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import styles from "./vitrine.module.css";

export type FamilyWithServices = ServiceFamily & { services: Service[] };

type Props = {
  page: Page;
  families: FamilyWithServices[];
  onBook?: (service: Service) => void; // absent en préview éditeur
  poweredBy?: boolean;
};

// Vitrine publique du commerçant, aux couleurs qu'il a choisies.
// Utilisée en SSR sur /p/[slug] et en préview live dans l'éditeur.
export function VitrineView({ page, families, onBook, poweredBy = true }: Props) {
  const [openFamily, setOpenFamily] = useState<string | null>(null);
  const [legalOpen, setLegalOpen] = useState<string | null>(null);

  const colors = {
    primary: page.colors.primary || "#d31212",
    dark: page.colors.dark || "#0a0a0a",
    text: page.colors.text || "#1c1c1c",
  };
  const font = getFont(page.font);
  const legal = { ...defaultLegal(page.business_name), ...page.legal };

  const socials = Object.entries(page.socials || {}).filter(([, v]) => v);

  return (
    <div
      className={styles.page}
      style={
        {
          fontFamily: font.css,
          "--client-accent": colors.primary,
          "--client-dark": colors.dark,
        } as React.CSSProperties
      }
    >
      {/* Bandeau offre */}
      {page.offer && (
        <div
          className={styles.offer}
          style={{ backgroundColor: colors.primary }}
        >
          {page.offer}
        </div>
      )}

      {/* Hero */}
      <header className={`${styles.hero} ${page.hero_url ? styles.heroWithImage : ""}`}>
        {page.hero_url && (
          <>
            <Image
              src={page.hero_url}
              alt=""
              fill
              className={styles.heroImage}
              sizes="100vw"
              priority
            />
            <div className={styles.heroOverlay} />
          </>
        )}
        <div className={styles.heroInner}>
          {page.logo_url && (
            <Image
              src={page.logo_url}
              alt={page.business_name}
              width={88}
              height={88}
              className={styles.logo}
            />
          )}
          {(page.job_title || page.city) && (
            <p className={styles.eyebrow}>
              {[page.job_title, page.city].filter(Boolean).join(" · ")}
            </p>
          )}
          <h1>
            {page.business_name || "Mon commerce"}
          </h1>
          {page.tagline && <p className={styles.tagline}>{page.tagline}</p>}
          <div className={styles.heroActions}>
            <a className={styles.heroCta} href="#prestations">
              Voir les prestations <ArrowRight aria-hidden="true" />
            </a>
            <span className={styles.online}>
              <span />
              Réservation en ligne
            </span>
          </div>
        </div>
      </header>

      {/* Prestations */}
      <section className={styles.services} id="prestations">
        <div className={styles.sectionHeading}>
          <p>Ce que je propose</p>
          <h2>Mes prestations</h2>
        </div>
        {families.length === 0 && (
          <p className={styles.empty}>
            Les prestations arrivent bientôt.
          </p>
        )}
        <div className={styles.familyList}>
          {families.map((family) => {
            const open = openFamily === family.id;
            return (
              <div key={family.id} className={styles.family}>
                <button
                  type="button"
                  onClick={() => setOpenFamily(open ? null : family.id)}
                  className={styles.familyButton}
                  aria-expanded={open}
                >
                  <span>
                    {family.name}
                  </span>
                  <ChevronDown className={open ? styles.chevronOpen : ""} aria-hidden="true" />
                </button>
                {open && (
                  <ul className={styles.serviceList}>
                    {family.services.map((service) => (
                      <li
                        key={service.id}
                        className={styles.service}
                      >
                        <div>
                          <p>{service.name}</p>
                          <p className={styles.duration}>
                            <Clock3 aria-hidden="true" /> {formatDuration(service.duration_min)}
                          </p>
                        </div>
                        <div className={styles.serviceAction}>
                          <span>
                            {service.price_cents === 0
                              ? "Offert"
                              : formatPrice(service.price_cents)}
                          </span>
                          {onBook && (
                            <button
                              type="button"
                              onClick={() => onBook(service)}
                              className={styles.bookButton}
                              style={{ backgroundColor: colors.primary }}
                            >
                              Réserver
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Galerie */}
        {page.gallery.length > 0 && (
          <div className={styles.contentSection}>
            <div className={styles.sectionHeading}><p>En images</p><h2>Mon travail</h2></div>
            <div className={styles.gallery}>
              {page.gallery.map((photo, i) => (
                <figure key={i}>
                  <Image
                    src={photo.url}
                    alt={photo.title || `Photo ${i + 1}`}
                    fill
                    className={styles.galleryImage}
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                  {photo.title && (
                    <figcaption>
                      {photo.title}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Avis */}
        {page.reviews.length > 0 && (
          <div className={styles.contentSection}>
            <div className={styles.sectionHeading}><p>Ils me font confiance</p><h2>Ce qu&apos;on dit de moi</h2></div>
            <div className={styles.reviews}>
              {page.reviews.map((review, i) => (
                <blockquote
                  key={i}
                  className={styles.review}
                >
                  <p className={styles.stars}>
                    ★★★★★
                  </p>
                  <p>« {review.text} »</p>
                  <footer>{review.author}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        )}

        {/* Horaires */}
        {page.hours_text && (
          <div className={styles.hours}>
            <div className={styles.sectionHeading}><p>Quand venir</p><h2>Mes horaires</h2></div>
            <pre
              className={styles.hoursText}
              style={{ fontFamily: font.css }}
            >
              {page.hours_text}
            </pre>
          </div>
        )}

        {/* Adresse */}
        {(page.address || page.city) && (
          <p className={styles.address}>
            <MapPin aria-hidden="true" /> {[page.address, page.city].filter(Boolean).join(" · ")}
          </p>
        )}
      </section>

      {/* Footer */}
      <footer
        className={styles.footer}
        style={{ backgroundColor: colors.dark }}
      >
        <p className={styles.footerKicker}>Restons en contact</p>
        <h2>{page.business_name || "Mon commerce"}</h2>
        {page.phone && (
          <p className={styles.phone}>
            <a href={`tel:${page.phone}`}>
              <Phone aria-hidden="true" /> {page.phone}
            </a>
          </p>
        )}
        {socials.length > 0 && (
          <p className={styles.socials}>
            {socials.map(([network, handle]) => (
              <span key={network} className="capitalize">
                {network} : {handle}
              </span>
            ))}
          </p>
        )}
        <p className={styles.legalLinks}>
          {(["mentions", "cgv", "confidentialite"] as const).map((key, i) => (
            <span key={key}>
              {i > 0 && " · "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => setLegalOpen(key)}
              >
                {key === "mentions"
                  ? "Mentions légales"
                  : key === "cgv"
                    ? "CGV"
                    : "Confidentialité"}
              </button>
            </span>
          ))}
        </p>
        {poweredBy && (
          <p className={styles.powered}>
            <Sparkles aria-hidden="true" />
            Créé avec <Link href="/">Wayne Web Flux</Link>
          </p>
        )}
      </footer>

      {/* Modale légale */}
      {legalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setLegalOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                {legalOpen === "mentions"
                  ? "Mentions légales"
                  : legalOpen === "cgv"
                    ? "Conditions générales de vente"
                    : "Politique de confidentialité"}
              </h3>
              <button
                type="button"
                onClick={() => setLegalOpen(null)}
                aria-label="Fermer"
                className={styles.close}
              >
                ×
              </button>
            </div>
            <pre>
              {legal[legalOpen as keyof typeof legal]}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
