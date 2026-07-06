"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, Service } from "@/lib/types";
import { formatDuration, formatPrice } from "@/lib/types";
import { Clock3, ChevronDown } from "lucide-react";
import type { CategoryWithProducts, FamilyWithServices } from "../vitrine-view";
import styles from "../vitrine.module.css";

type Mode = "combined" | "boutique" | "prestations";

type Props = {
  mode: Mode;
  families: FamilyWithServices[];
  productCategories: CategoryWithProducts[];
  accent: string;
  onBook?: (service: Service) => void;
  onAddToCart?: (product: Product) => void;
  showEmpty?: boolean; // catalogue vide et aucune offre : message d'attente
  first?: boolean;
  title?: string;
  subtitle?: string;
};

// Bloc catalogue de la vitrine. En mode "combined" (boutique et prestations
// adjacentes dans l'ordre des sections), reproduit exactement le markup
// historique : un seul titre, produits en haut, réservations en bas.
export function CatalogSection({
  mode,
  families,
  productCategories,
  accent,
  onBook,
  onAddToCart,
  showEmpty = false,
  first = false,
  title,
  subtitle,
}: Props) {
  const [openFamily, setOpenFamily] = useState<string | null>(
    families[0]?.id ?? null
  );

  const withShop = mode !== "prestations";
  const withServices = mode !== "boutique";
  const hasServices = withServices && families.length > 0;
  const hasShop =
    withShop && productCategories.some((c) => c.products.length > 0);

  if (!hasServices && !hasShop) {
    if (mode === "combined" && showEmpty) {
      return <p className={styles.empty}>Le catalogue arrive bientôt.</p>;
    }
    return null;
  }

  const heading =
    mode === "combined"
      ? hasShop && !hasServices
        ? { p: "Ce que je propose", h2: title || "Produits", span: subtitle || "Des produits à commander." }
        : hasServices && !hasShop
          ? { p: "Ce que je propose", h2: title || "Réservations", span: subtitle || "Des rendez-vous à réserver." }
          : { p: "Ce que je propose", h2: title || "Mes prestations", span: subtitle || "Produits à commander et rendez-vous à réserver." }
      : mode === "boutique"
        ? { p: "Ce que je propose", h2: title || "Ma boutique", span: subtitle || "Des produits à commander." }
        : { p: "Ce que je propose", h2: title || "Mes prestations", span: subtitle || "Des rendez-vous à réserver." };

  const shop = hasShop && (
    <div
      className={`${styles.contentSection} ${mode !== "combined" && first ? styles.firstInGroup : ""}`}
      id="boutique"
    >
      {mode === "combined" && hasServices && (
        <h3 className={styles.subHeading}>Produits</h3>
      )}
      {mode !== "combined" && (
        <div className={styles.sectionHeading}>
          <p>{heading.p}</p>
          <h2>{heading.h2}</h2>
          <span>{heading.span}</span>
        </div>
      )}
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
                            style={{ backgroundColor: accent }}
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
  );

  const services = hasServices && (
    <div
      className={
        mode === "combined"
          ? hasShop
            ? styles.contentSection
            : undefined
          : `${styles.contentSection} ${first ? styles.firstInGroup : ""}`
      }
      id="reservations"
    >
      {mode === "combined" && hasShop && (
        <h3 className={styles.subHeading}>Réservations</h3>
      )}
      {mode !== "combined" && (
        <div className={styles.sectionHeading}>
          <p>{heading.p}</p>
          <h2>{heading.h2}</h2>
          <span>{heading.span}</span>
        </div>
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
                <span>{family.name}</span>
                <ChevronDown
                  className={open ? styles.chevronOpen : ""}
                  aria-hidden="true"
                />
              </button>
              {open && (
                <ul className={styles.serviceList}>
                  {family.services.map((service) => (
                    <li key={service.id} className={styles.service}>
                      <div>
                        <p>{service.name}</p>
                        <p className={styles.duration}>
                          <Clock3 aria-hidden="true" />{" "}
                          {formatDuration(service.duration_min)}
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
                            style={{ backgroundColor: accent }}
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
  );

  if (mode === "boutique") return <>{shop}</>;
  if (mode === "prestations") return <>{services}</>;

  // En tête de groupe (cas historique), aucun wrapper : markup identique à
  // l'ancien vitrine-view. Plus bas dans la page, on reprend la marge standard.
  return (
    <div className={first ? undefined : styles.contentSection}>
      {(hasServices || hasShop) && (
        <div className={styles.sectionHeading}>
          <p>{heading.p}</p>
          <h2>{heading.h2}</h2>
          <span>{heading.span}</span>
        </div>
      )}
      {shop}
      {services}
    </div>
  );
}
