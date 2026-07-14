import type { DesignEntry, DesignSlot } from "../types";

const base = (
  slot: DesignSlot,
  id: string,
  name: string,
  description: string,
  tags: string[],
  capabilities: string[] = []
): DesignEntry => ({
  id, slot, name, description, tags, capabilities, status: "stable",
  preview: `${slot}/${id}`, renderId: id,
});

export const DESIGN_COMPONENTS: DesignEntry[] = [
  base("button", "button-pill", "Capsule classique", "Bouton plein aux couleurs du commerçant.", ["universel", "conversion"], ["hover", "disabled"]),
  base("button", "button-smooth-flux", "Smooth FLUX", "Remplissage blanc coulissant et texte contrasté au survol.", ["premium", "fluide", "conversion"], ["hover", "reduced-motion", "disabled"]),
  base("button", "button-square", "Impact carré", "Bouton graphique aux angles courts.", ["impact", "direct"]),
  base("button", "button-outline-luxe", "Contour prestige", "Bouton fin, transparent et éditorial.", ["luxe", "sobre"]),
  base("navigation", "navigation-glass", "Navigation verre", "Navigation flottante translucide.", ["moderne", "premium"], ["desktop", "mobile"]),
  base("navigation", "navigation-minimal", "Navigation minimale", "Navigation discrète sans profondeur.", ["minimal", "clair"], ["desktop", "mobile"]),
  base("navigation", "navigation-prestige", "Navigation prestige", "Filet éditorial et typographie espacée.", ["luxe", "showroom"], ["desktop", "mobile"]),
  base("header", "header-editorial", "Hero éditorial", "Grand hero lisible guidé par l’image.", ["éditorial", "image"]),
  base("header", "header-centered", "Hero centré", "Composition centrée, cinématique et rassurante.", ["studio", "luxe"]),
  base("header", "header-impact", "Hero impact", "Titres massifs orientés conversion.", ["impact", "commerce"]),
  base("footer", "footer-standard", "Footer essentiel", "Coordonnées, réseaux et accès légal.", ["universel"], ["legal-links", "socials"]),
  base("footer", "footer-prestige", "Footer prestige", "Footer sombre aux filets champagne.", ["luxe"], ["legal-links", "socials"]),
  base("section", "section-cards", "Sections en cartes", "Surfaces douces et structurées.", ["universel"]),
  base("section", "section-flat", "Sections plates", "Mise en page minimale sans ombre.", ["minimal"]),
  base("section", "section-glow", "Sections lumineuses", "Surfaces sombres avec halos colorés.", ["néon", "premium"]),
  base("category", "category-accordion", "Catégories accordéon", "Familles dépliables compactes.", ["service", "mobile"]),
  base("category", "category-grid", "Catégories grille", "Lecture directe et commerciale.", ["produit", "commerce"]),
  base("product", "product-card", "Fiche produit classique", "Carte produit lisible avec prix et action.", ["e-commerce"]),
  base("product", "product-minimal", "Fiche produit minimale", "Présentation épurée centrée sur l’image.", ["minimal", "e-commerce"]),
  base("cart", "cart-floating", "Panier flottant", "Accès permanent au panier actif.", ["e-commerce", "mobile"]),
  base("order", "order-modal", "Commande guidée", "Panier, coordonnées puis confirmation.", ["e-commerce"], ["cart", "form", "confirmation"]),
  base("booking", "booking-modal", "Réservation guidée", "Jour, créneau puis coordonnées.", ["service"], ["calendar", "form", "confirmation"]),
  base("legal", "legal-modal", "Légal intégré", "Mentions, CGV et confidentialité dans une modale lisible.", ["conformité"], ["mentions", "cgv", "privacy"]),
  base("checkout", "checkout-future", "Checkout marchand", "Contrat réservé au futur paiement des boutiques.", ["e-commerce", "future"], ["summary", "payment", "confirmation"]),
];
