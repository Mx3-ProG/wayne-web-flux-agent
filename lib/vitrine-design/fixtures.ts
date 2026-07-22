import type { Offer, Page, PageTheme, Product, ProductCategory, Service, ServiceFamily } from "@/lib/types";
import type { PageSection } from "@/lib/sections";
import { DESIGN_KITS } from "./kits/catalog";

const sections: PageSection[] = [
  { id: "promo", type: "promo", enabled: true },
  { id: "story", type: "texte", enabled: true, style: { align: "center", width: "narrow" }, settings: { title: "Une maison pensée pour durer", body: "Un savoir-faire précis, des matières choisies et un service attentif à chaque détail." } },
  { id: "offres", type: "offres", enabled: true },
  { id: "boutique", type: "boutique", enabled: true },
  { id: "prestations", type: "prestations", enabled: true },
  { id: "about", type: "a_propos", enabled: true, settings: { photoUrl: "/temoignages/marco_restaurant.jpg", title: "L’histoire de l’atelier", body: "Nous accueillons chaque client avec la même exigence : comprendre son besoin et créer une expérience mémorable." } },
  { id: "gallery", type: "galerie", enabled: true },
  { id: "reviews", type: "avis", enabled: true },
  { id: "faq", type: "faq", enabled: true, settings: { title: "Questions fréquentes", items: [{ question: "Puis-je réserver en ligne ?", answer: "Oui, sélectionnez la prestation et le créneau qui vous conviennent." }, { question: "Proposez-vous le retrait ?", answer: "Le retrait en atelier est disponible sur toute la collection." }] } },
  { id: "hours", type: "horaires", enabled: true },
  { id: "newsletter", type: "newsletter", enabled: true, style: { align: "center", background: { kind: "gradient", from: "#111318", to: "#efe7dc" } }, settings: { title: "Le journal de la maison", description: "Nouveautés, gestes et rendez-vous choisis." } },
];

export function storefrontGalleryFixture(theme: PageTheme): Page {
  const kit = DESIGN_KITS.find((entry) => entry.legacyTheme === theme) ?? DESIGN_KITS[0];
  return {
    id: `fixture-${theme}`, user_id: "fixture", slug: `fixture-${theme}`,
    default_locale: "fr", enabled_locales: ["fr"], vertical: "artisan",
    business_name: "Atelier Ulysée", job_title: "Maison indépendante · Lyon",
    tagline: "Le beau, utilement.", city: "Lyon", address: "21 rue de la République",
    phone: "+33400000000", socials: { instagram: "https://instagram.com" },
    colors: kit.defaults.colors, appearance: { accent: kit.defaults.colors.primary, mode: kit.defaults.colors.background.startsWith("#0") || kit.defaults.colors.background.startsWith("#1") ? "dark" : "light", allowVisitorModeToggle: true },
    font: kit.defaults.font, theme, logo_url: null, hero_url: "/demos/automobile-luxe/hero-poster.jpg",
    gallery: [{ url: "/demos/automobile-luxe/lamborghini-urus.jpg", title: "La collection" }, { url: "/demos/automobile-luxe/aston-martin-db9.jpg", title: "Le geste" }, { url: "/demos/automobile-luxe/ferrari-488-gtb.jpg", title: "L’atelier" }],
    reviews: [{ author: "Camille", text: "Une expérience remarquable, jusque dans les détails.", rating: 5 }, { author: "Nicolas", text: "Juste, chaleureux et parfaitement exécuté.", rating: 5 }],
    offer: "Découverte de la maison", hours_text: "Mardi — samedi · 10h — 19h",
    legal: {}, sections, seo: {}, promo: { text: "Livraison offerte cette semaine", code: "MAISON" },
    floating_cta: { type: "whatsapp", number: "+33400000000" }, hero_video_url: null,
    hide_branding: false, navigation: { sticky: true, transparent: true, showLogo: true, items: [{ id: "home", label: "Accueil", kind: "page", target: "" }, { id: "collection", label: "Collection", kind: "anchor", target: "#prestations" }], cta: { label: "Nous rencontrer", target: "#prestations" } },
    scroll_top: true, assistant_enabled: false, typography: kit.defaults.typography, design: { kitId: kit.id }, design_engine_version: 2,
    moderation_status: "verified", verified_by: null, verified_at: null, verified_version: null,
    archived_by: null, archived_at: null, archive_reason: null, moderation_was_published: true,
    published: true, custom_domain: null, ical_token: "fixture", journey_completed_steps: [], draft: null,
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  };
}

export const STOREFRONT_GALLERY_THEMES = DESIGN_KITS.map((kit) => kit.legacyTheme);

const family: ServiceFamily = { id: "fixture-family", page_id: "fixture", name: "Expériences", position: 0, product_category_id: null };
const service: Service = { id: "fixture-service", family_id: family.id, page_id: "fixture", product_id: null, name: "Rendez-vous découverte", duration_min: 45, price_cents: 6500, position: 0 };
const category: ProductCategory = { id: "fixture-category", page_id: "fixture", name: "Objets signature", position: 0 };
const product: Product = { id: "fixture-product", category_id: category.id, page_id: "fixture", kind: "product", name: "Pièce atelier", description: "Fabriquée en petite série.", price_cents: 12000, duration_min: 0, image_url: "/demos/automobile-luxe/aston-martin-db9.jpg", active: true, track_stock: false, stock: 12, position: 0, created_at: "2026-01-01T00:00:00.000Z" };
const offer: Offer = { id: "fixture-offer", page_id: "fixture", title: "Édition découverte", description: "Une sélection exclusive pour découvrir la maison.", image_url: "/demos/automobile-luxe/ferrari-488-gtb.jpg", kind: "produit", price_cents: 8900, compare_at_cents: 11000, active: true, position: 0, draft: null, draft_status: null, created_at: "2026-01-01T00:00:00.000Z" };

export const STOREFRONT_GALLERY_COMMERCE = {
  families: [{ ...family, services: [service] }],
  productCategories: [{ ...category, products: [product] }],
  offers: [offer],
};
