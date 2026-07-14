// Types des lignes de la base (miroir de supabase/migrations/00001_schema.sql)

export type Plan = "basique" | "pro" | "business" | "entreprise";

export type Profile = {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  business_email: string | null;
  siret: string | null;
  address: string | null;
  onboarding_step: number;
  ical_token: string;
  plan: Plan;
  // Essai applicatif sans carte, puis cycle de facturation piloté par Stripe.
  trial_ends_at: string;
  subscribed_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  active_page_id: string | null;
  created_at: string;
};

export type PageColors = {
  primary?: string;
  dark?: string;
  text?: string;
  background?: string;
  card?: string;
  heroGradient?: boolean;
};

export type PageTheme =
  | "editorial"
  | "studio"
  | "local"
  | "bold"
  | "luxe"
  | "minimal"
  | "neon"
  | "prestige";

// Typographie fine : échelle des titres et police de titres distincte du
// corps (id de lib/verticals FONTS). Vide = rendu historique.
export type PageTypography = {
  headingScale?: "s" | "m" | "l" | "xl";
  headingFont?: string;
};

// rating (1-5, défaut 5) et photoUrl optionnels : les avis historiques restent valides.
export type Review = { author: string; text: string; rating?: number; photoUrl?: string };
export type GalleryPhoto = { url: string; title?: string };

// Bandeau promo. Remplace la colonne texte `offer` (lue en fallback si promo null).
export type PagePromo = { text: string; code?: string; endsAt?: string };

// Bouton flottant de contact sur la vitrine publique.
export type FloatingCta = { type: "whatsapp" | "phone"; number: string };

export type PageSeo = { title?: string; description?: string; ogImageUrl?: string };

// Lien du menu de navigation configurable.
//   page     → target = path de la sous-page ('' = accueil)
//   anchor   → target = '#offres', '#prestations', '#s-<sectionId>'…
//   external → target = URL complète
export type NavItem = {
  id: string;
  label: string;
  kind: "page" | "anchor" | "external";
  target: string;
};

// Header public configurable (pages.navigation). null = header historique.
export type PageNavigation = {
  items: NavItem[];
  sticky?: boolean;
  transparent?: boolean;
  showLogo?: boolean;
  cta?: { label: string; target: string } | null;
};

export type Page = {
  id: string;
  user_id: string;
  slug: string;
  vertical: string;
  business_name: string;
  job_title: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  socials: Record<string, string>;
  colors: PageColors;
  font: string;
  theme: PageTheme;
  logo_url: string | null;
  hero_url: string | null;
  gallery: GalleryPhoto[];
  reviews: Review[];
  offer: string;
  hours_text: string;
  legal: Record<string, string>;
  // null = ordre historique des sections (voir lib/sections.ts).
  sections: import("./sections").PageSection[] | null;
  seo: PageSeo;
  promo: PagePromo | null;
  floating_cta: FloatingCta | null;
  hero_video_url: string | null;
  hide_branding: boolean;
  navigation: PageNavigation | null;
  scroll_top: boolean;
  typography: PageTypography;
  published: boolean;
  custom_domain: string | null;
  ical_token: string;
  journey_completed_steps: number[];
  draft: Partial<PageDraftFields> | null;
  created_at: string;
  updated_at: string;
};

// Champs de la vitrine éditables via le brouillon (pages.draft).
// ⚠️ Tout ajout ici exige une mise à jour du UPDATE de publish_page
// (dernière version : supabase/migrations/00023_themes_typography.sql),
// sinon le champ resterait en brouillon sans jamais être publié.
export type PageDraftFields = Pick<
  Page,
  | "business_name"
  | "job_title"
  | "tagline"
  | "city"
  | "address"
  | "phone"
  | "socials"
  | "colors"
  | "font"
  | "theme"
  | "logo_url"
  | "hero_url"
  | "gallery"
  | "reviews"
  | "offer"
  | "hours_text"
  | "legal"
  | "sections"
  | "seo"
  | "promo"
  | "floating_cta"
  | "hero_video_url"
  | "hide_branding"
  | "navigation"
  | "scroll_top"
  | "typography"
>;

// Sous-page d'un projet (table site_pages, migration 00021). La page
// d'accueil reste dans `pages` ; les sous-pages (/p/slug/a-propos…) sont
// composées avec le même système de sections. Même workflow brouillon que
// les offres : draft + draft_status ('new' = jamais publiée, invisible en
// public ; 'deleted' = suppression différée à la prochaine publication).
export type SitePage = {
  id: string;
  page_id: string;
  path: string;
  title: string;
  subtitle: string;
  hero_url: string | null;
  seo: PageSeo;
  sections: import("./sections").PageSection[] | null;
  position: number;
  draft: Partial<SitePageDraftFields> | null;
  draft_status: "new" | "deleted" | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

// Champs d'une sous-page éditables via le brouillon (site_pages.draft).
// ⚠️ Tout ajout ici exige une mise à jour du UPDATE site_pages de publish_page
// (dernière version : supabase/migrations/00023_themes_typography.sql).
export type SitePageDraftFields = Pick<
  SitePage,
  "path" | "title" | "subtitle" | "hero_url" | "seo" | "sections"
>;

export type ServiceFamily = {
  id: string;
  page_id: string;
  name: string;
  position: number;
  product_category_id: string | null;
};

export type Service = {
  id: string;
  family_id: string;
  page_id: string;
  product_id: string | null;
  name: string;
  duration_min: number;
  price_cents: number;
  position: number;
};

export type TimeRange = [string, string]; // ["09:00","12:00"]

export type Schedule = {
  page_id: string;
  weekday: number; // 0 = dimanche
  open: boolean;
  ranges: TimeRange[];
};

export type BlockedPeriod = {
  id: string;
  page_id: string;
  start_date: string;
  end_date: string;
  reason: string;
};

export type Booking = {
  id: string;
  page_id: string;
  service_id: string | null;
  service_name: string;
  duration_min: number;
  price_cents: number;
  date: string;
  start_time: string;
  first_name: string;
  phone: string;
  email: string | null;
  status: "confirmed" | "cancelled";
  created_at: string;
};

export type ProductCategory = {
  id: string;
  page_id: string;
  name: string;
  position: number;
};

export type ProductKind = "product" | "reservation";

export type Product = {
  id: string;
  category_id: string | null;
  page_id: string;
  kind: ProductKind;
  name: string;
  description: string;
  price_cents: number;
  duration_min: number;
  image_url: string | null;
  active: boolean;
  track_stock: boolean;
  stock: number;
  position: number;
  created_at: string;
};

export type OfferKind = "produit" | "service" | "evenement";

export type OfferDraftFields = Pick<
  Offer,
  | "title"
  | "description"
  | "image_url"
  | "kind"
  | "price_cents"
  | "compare_at_cents"
  | "active"
>;

export type Offer = {
  id: string;
  page_id: string;
  title: string;
  description: string;
  image_url: string | null;
  kind: OfferKind;
  price_cents: number;
  compare_at_cents: number | null;
  active: boolean;
  position: number;
  // Brouillon : modifications en attente de publication. `new` = jamais
  // publiée (invisible en public), `deleted` = supprimée à la prochaine
  // publication.
  draft: Partial<OfferDraftFields> | null;
  draft_status: "new" | "deleted" | null;
  created_at: string;
};

export type PageVersion = {
  id: string;
  page_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  credits_spent: number;
  created_at: string;
};

export type StockMovement = {
  id: number;
  product_id: string;
  page_id: string;
  delta: number;
  reason: "sale" | "restock" | "adjustment" | "cancel";
  order_id: string | null;
  created_at: string;
};

export type OrderStatus = "pending" | "accepted" | "fulfilled" | "cancelled";

export type Order = {
  id: string;
  page_id: string;
  first_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  note: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  accepted_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  offer_id: string | null;
  name: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type Notification = {
  id: string;
  user_id: string;
  page_id: string;
  type: "order" | "booking";
  ref_id: string | null;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export type Customer = {
  id: string;
  page_id: string;
  phone: string;
  first_name: string;
  email: string | null;
  address: string | null;
  note: string;
  created_at: string;
};

// Abonné newsletter capturé sur la vitrine publique (table page_subscribers).
export type PageSubscriber = {
  id: string;
  page_id: string;
  email: string;
  created_at: string;
};

// Événements de fréquentation de la vitrine (table page_events).
export type PageEventKind =
  | "view"
  | "phone_click"
  | "social_click"
  | "whatsapp_click"
  | "newsletter_signup";

export type CreditEntry = {
  id: number;
  user_id: string;
  delta: number;
  reason: string;
  created_at: string;
};

export type Generation = {
  id: string;
  user_id: string;
  page_id: string | null;
  tool_slug: string;
  inputs: Record<string, string>;
  output: string;
  credits_spent: number;
  created_at: string;
};

export type VoiceProfile = {
  user_id: string;
  page_id: string;
  tone: string;
  address_form: string;
  emojis: string;
  specialty: string;
  often_told: string;
  story: string;
  vals: string;
  updated_at: string;
};

export function formatPrice(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros)
    ? `${euros} €`
    : `${euros.toFixed(2).replace(".", ",")} €`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
