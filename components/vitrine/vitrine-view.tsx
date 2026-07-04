"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Offer, Page, Product, ProductCategory, Service, ServiceFamily } from "@/lib/types";
import { formatDuration, formatPrice } from "@/lib/types";
import { getFont } from "@/lib/verticals";
import { defaultLegal } from "@/lib/legal";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import styles from "./vitrine.module.css";

export type FamilyWithServices = ServiceFamily & { services: Service[] };
export type CategoryWithProducts = ProductCategory & { products: Product[] };

const OFFER_KIND_LABEL: Record<Offer["kind"], string> = {
  produit: "Produit",
  service: "Service",
  evenement: "Événement",
};

type Props = {
  page: Page;
  families: FamilyWithServices[];
  productCategories?: CategoryWithProducts[];
  offers?: Offer[];
  onBook?: (service: Service) => void; // absent en préview éditeur
  onAddToCart?: (product: Product) => void; // absent en préview éditeur
  onAddOffer?: (offer: Offer) => void; // absent en préview éditeur
  cartCount?: number;
  onOpenCart?: () => void;
  poweredBy?: boolean;
};

// Vitrine publique du commerçant, aux couleurs qu'il a choisies.
// Utilisée en SSR sur /p/[slug] et en préview live dans l'éditeur.
export function VitrineView({
  page,
  families,
  productCategories = [],
  offers = [],
  onBook,
  onAddToCart,
  onAddOffer,
  cartCount = 0,
  onOpenCart,
  poweredBy = true,
}: Props) {
  const [openFamily, setOpenFamily] = useState<string | null>(
    families[0]?.id ?? null
  );
  const [legalOpen, setLegalOpen] = useState<string | null>(null);

  const colors = {
    primary: page.colors.primary || "#d31212",
    dark: page.colors.dark || "#0a0a0a",
    text: page.colors.text || "#1c1c1c",
  };
  const font = getFont(page.font);
  const legal = { ...defaultLegal(page.business_name), ...page.legal };

  const socials = Object.entries(page.socials || {}).filter(([, v]) => v);
  const hasServices = families.length > 0;
  const hasShop = productCategories.some((c) => c.products.length > 0);
  const activeOffers = offers.filter((o) => o.active);
  const hasOffers = activeOffers.length > 0;
  const primaryAnchor = hasOffers ? "#offres" : "#prestations";

  return (
    <div
      className={styles.page}
      data-theme={page.theme || "editorial"}
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
        <div className={styles.storeNav}>
          <span className={styles.storeNavName}>
            {page.logo_url ? (
              <Image
                src={page.logo_url}
                alt=""
                width={34}
                height={34}
              />
            ) : (
              <i>{(page.business_name || "M").charAt(0).toUpperCase()}</i>
            )}
            <b>{page.business_name || "Mon commerce"}</b>
          </span>
          <a href={primaryAnchor}>
            {hasOffers ? "Voir les offres" : hasServices ? "Réserver" : "Découvrir"}
          </a>
        </div>
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
            <a className={styles.heroCta} href={primaryAnchor}>
              {hasOffers
                ? "Voir les offres"
                : hasServices
                  ? "Voir les prestations"
                  : "Découvrir la boutique"}{" "}
              <ArrowRight aria-hidden="true" />
            </a>
            <span className={styles.online}>
              <span />
              {hasServices ? "Réservation en ligne" : "Commande en ligne"}
            </span>
          </div>
        </div>
      </header>

      {/* Offres mises en avant */}
      {hasOffers && (
        <section className={styles.offers} id="offres">
          <div className={styles.sectionHeading}>
            <p>À ne pas manquer</p>
            <h2>Mes offres</h2>
            <span>Des offres à saisir maintenant.</span>
          </div>
          <div className={styles.offersGrid}>
            {activeOffers.map((offer) => {
              const promo =
                offer.compare_at_cents != null &&
                offer.compare_at_cents > offer.price_cents;
              return (
                <article key={offer.id} className={styles.offerCard}>
                  {offer.image_url && (
                    <div className={styles.offerImage}>
                      <Image
                        src={offer.image_url}
                        alt={offer.title}
                        fill
                        className={styles.galleryImage}
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    </div>
                  )}
                  <div className={styles.offerBody}>
                    <span className={styles.offerKind}>
                      <Tag aria-hidden="true" /> {OFFER_KIND_LABEL[offer.kind]}
                    </span>
                    <h3 className={styles.offerTitle}>{offer.title}</h3>
                    {offer.description && (
                      <p className={styles.offerDesc}>{offer.description}</p>
                    )}
                    <div className={styles.offerFoot}>
                      <span className={styles.offerPrice}>
                        {promo && (
                          <s className={styles.offerCompare}>
                            {formatPrice(offer.compare_at_cents!)}
                          </s>
                        )}
                        {formatPrice(offer.price_cents)}
                      </span>
                      {onAddOffer && (
                        <button
                          type="button"
                          onClick={() => onAddOffer(offer)}
                          className={styles.addButton}
                          style={{ backgroundColor: colors.primary }}
                        >
                          {offer.kind === "produit" ? "Commander" : "J'en profite"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Prestations : produits (haut) puis réservations (bas) */}
      <section className={styles.services} id="prestations">
        {!hasServices && !hasShop && !hasOffers && (
          <p className={styles.empty}>Le catalogue arrive bientôt.</p>
        )}
        {(hasServices || hasShop) && (
        <div className={styles.sectionHeading}>
          <p>Ce que je propose</p>
          <h2>Mes prestations</h2>
          <span>Produits à commander et rendez-vous à réserver.</span>
        </div>
        )}

        {/* Produits */}
        {hasShop && (
          <div className={styles.contentSection} id="boutique">
            {hasServices && <h3 className={styles.subHeading}>Produits</h3>}
            {productCategories
              .filter((c) => c.products.length > 0)
              .map((category) => (
                <div key={category.id} className={styles.shopCategory}>
                  {productCategories.filter((c) => c.products.length > 0).length > 1 && (
                    <h4 className={styles.shopCategoryName}>{category.name}</h4>
                  )}
                  <div className={styles.shopGrid}>
                    {category.products.map((product) => (
                      <article key={product.id} className={styles.product}>
                        {product.image_url && (
                          <div className={styles.productImage}>
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className={styles.galleryImage}
                              sizes="(max-width: 640px) 50vw, 33vw"
                            />
                          </div>
                        )}
                        <div className={styles.productBody}>
                          <p className={styles.productName}>{product.name}</p>
                          {product.description && (
                            <p className={styles.productDesc}>{product.description}</p>
                          )}
                          <div className={styles.productFoot}>
                            <span className={styles.productPrice}>
                              {formatPrice(product.price_cents)}
                            </span>
                            {product.track_stock && product.stock <= 0 ? (
                              <span className={styles.soldOut}>Épuisé</span>
                            ) : (
                              onAddToCart && (
                                <button
                                  type="button"
                                  onClick={() => onAddToCart(product)}
                                  className={styles.addButton}
                                  style={{ backgroundColor: colors.primary }}
                                >
                                  Ajouter
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Réservations */}
        {hasServices && (
        <div className={hasShop ? styles.contentSection : undefined} id="reservations">
          {hasShop && <h3 className={styles.subHeading}>Réservations</h3>}
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
        </div>
        )}

        {/* Galerie */}
        {page.gallery.length > 0 && (
          <div className={styles.contentSection}>
            <div className={styles.sectionHeading}><p>En images</p><h2>Mon travail</h2><span>Quelques détails qui racontent mon univers.</span></div>
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
            <div className={styles.sectionHeading}><p>Ils me font confiance</p><h2>Ce qu&apos;on dit de moi</h2><span>Des mots vrais, laissés par mes clients.</span></div>
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
            <div className={styles.sectionHeading}><p>Quand venir</p><h2>Mes horaires</h2><span>Retrouve-moi au bon moment.</span></div>
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

      {/* Panier flottant */}
      {onOpenCart && cartCount > 0 && (
        <button
          type="button"
          onClick={onOpenCart}
          className={styles.cartFab}
          style={{ backgroundColor: colors.primary }}
        >
          <ShoppingBag aria-hidden="true" />
          <span>Voir le panier</span>
          <span className={styles.cartFabCount}>{cartCount}</span>
        </button>
      )}

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
