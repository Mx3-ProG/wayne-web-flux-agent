// Verticales métiers : données INVARIANTES uniquement (identifiants stables,
// structure, prix, durées, couleurs). Le texte (labels, métiers, vocabulaire,
// contexte IA, noms de prestations/produits) vit dans les dictionnaires i18n
// — voir lib/verticals-i18n.ts pour l'API localisée. Les slugs et ids définis
// ici sont la source de vérité : ne jamais les dériver d'une traduction.

export type VerticalService = {
  id: string;
  duration_min: number;
  price_cents: number;
};

export type VerticalFamily = {
  id: string;
  services: VerticalService[];
};

export type VerticalProduct = {
  id: string;
  price_cents: number;
};

export type VerticalProductCategory = {
  id: string;
  products: VerticalProduct[];
};

// service : uniquement des prestations sur RDV (par défaut, historique).
// product : uniquement une boutique de produits.
// hybrid  : les deux (prestations + boutique).
export type VerticalKind = "service" | "product" | "hybrid";

export type Vertical = {
  slug: string;
  emoji: string;
  kind: VerticalKind;
  defaultColors: { primary: string; dark: string; text: string };
  families: VerticalFamily[];
  productCategories?: VerticalProductCategory[]; // boutique pré-remplie
};

export const VERTICALS: Vertical[] = [
  {
    slug: "beaute",
    emoji: "💅",
    kind: "service",
    defaultColors: { primary: "#b4886b", dark: "#1c1512", text: "#2b211c" },
    families: [
      {
        id: "soins-visage",
        services: [
          { id: "soin-eclat", duration_min: 60, price_cents: 6500 },
          { id: "soin-anti-age", duration_min: 75, price_cents: 8500 },
        ],
      },
      {
        id: "ongles",
        services: [
          { id: "pose-gel", duration_min: 90, price_cents: 5500 },
          { id: "remplissage", duration_min: 60, price_cents: 4000 },
          { id: "vernis-semi-permanent", duration_min: 45, price_cents: 3500 },
        ],
      },
      {
        id: "cils-sourcils",
        services: [
          { id: "extension-cils", duration_min: 120, price_cents: 9000 },
          { id: "rehaussement-cils", duration_min: 60, price_cents: 5500 },
          { id: "restructuration-sourcils", duration_min: 30, price_cents: 2000 },
        ],
      },
    ],
  },
  {
    slug: "coiffure",
    emoji: "✂️",
    kind: "service",
    defaultColors: { primary: "#8a6d5c", dark: "#171310", text: "#241d18" },
    families: [
      {
        id: "coupes",
        services: [
          { id: "coupe-femme", duration_min: 60, price_cents: 4500 },
          { id: "coupe-homme", duration_min: 30, price_cents: 2500 },
          { id: "coupe-barbe", duration_min: 45, price_cents: 3500 },
        ],
      },
      {
        id: "couleur",
        services: [
          { id: "coloration-complete", duration_min: 120, price_cents: 7500 },
          { id: "balayage", duration_min: 150, price_cents: 9500 },
        ],
      },
    ],
  },
  {
    slug: "restaurant",
    emoji: "🍽️",
    kind: "service",
    defaultColors: { primary: "#a33b2e", dark: "#14100d", text: "#241b16" },
    families: [
      {
        id: "reservations",
        services: [
          { id: "table-dejeuner", duration_min: 90, price_cents: 0 },
          { id: "table-diner", duration_min: 120, price_cents: 0 },
        ],
      },
      {
        id: "evenements",
        services: [
          { id: "privatisation", duration_min: 240, price_cents: 15000 },
          { id: "menu-degustation", duration_min: 150, price_cents: 6500 },
        ],
      },
    ],
  },
  {
    slug: "auto",
    emoji: "🚗",
    kind: "hybrid",
    defaultColors: { primary: "#2e5aa3", dark: "#0e1116", text: "#1a1e24" },
    families: [
      {
        id: "entretien",
        services: [
          { id: "vidange-filtres", duration_min: 60, price_cents: 9900 },
          { id: "revision-complete", duration_min: 120, price_cents: 19900 },
          { id: "plaquettes-frein", duration_min: 90, price_cents: 14900 },
        ],
      },
      {
        id: "esthetique",
        services: [
          { id: "lavage-int-ext", duration_min: 90, price_cents: 6900 },
          { id: "polish-ceramique", duration_min: 240, price_cents: 39900 },
        ],
      },
    ],
    productCategories: [
      {
        id: "pieces-accessoires",
        products: [
          { id: "roue", price_cents: 2000 },
          { id: "balais-essuie-glace", price_cents: 1900 },
          { id: "batterie-12v", price_cents: 8900 },
        ],
      },
      {
        id: "produits-entretien",
        products: [
          { id: "huile-moteur-5l", price_cents: 4500 },
          { id: "kit-lavage-auto", price_cents: 2500 },
        ],
      },
    ],
  },
  {
    slug: "artisan",
    emoji: "🔧",
    kind: "service",
    defaultColors: { primary: "#c07f24", dark: "#12100c", text: "#211c14" },
    families: [
      {
        id: "interventions",
        services: [
          { id: "diagnostic-devis", duration_min: 60, price_cents: 0 },
          { id: "depannage-urgent", duration_min: 90, price_cents: 9000 },
          { id: "petits-travaux", duration_min: 60, price_cents: 5500 },
        ],
      },
    ],
  },
  {
    slug: "commerce",
    emoji: "🛍️",
    kind: "product",
    defaultColors: { primary: "#c2410c", dark: "#12100e", text: "#211b16" },
    families: [],
    productCategories: [
      {
        id: "nouveautes",
        products: [
          { id: "article-vedette", price_cents: 2900 },
          { id: "coup-de-coeur", price_cents: 1900 },
        ],
      },
      {
        id: "best-sellers",
        products: [
          { id: "produit-populaire", price_cents: 2500 },
          { id: "pack-decouverte", price_cents: 4900 },
        ],
      },
    ],
  },
  {
    slug: "alimentation",
    emoji: "🥖",
    kind: "product",
    defaultColors: { primary: "#b45309", dark: "#141009", text: "#241d12" },
    families: [],
    productCategories: [
      {
        id: "boulangerie",
        products: [
          { id: "baguette-tradition", price_cents: 130 },
          { id: "pain-campagne", price_cents: 350 },
          { id: "croissant", price_cents: 130 },
        ],
      },
      {
        id: "patisserie",
        products: [
          { id: "eclair", price_cents: 350 },
          { id: "tarte-du-jour", price_cents: 400 },
          { id: "gateau-a-commander", price_cents: 2500 },
        ],
      },
    ],
  },
  {
    slug: "mode",
    emoji: "👗",
    kind: "product",
    defaultColors: { primary: "#9d174d", dark: "#120a0e", text: "#20141a" },
    families: [],
    productCategories: [
      {
        id: "vetements",
        products: [
          { id: "t-shirt", price_cents: 3500 },
          { id: "robe", price_cents: 7900 },
          { id: "veste", price_cents: 12900 },
        ],
      },
      {
        id: "accessoires",
        products: [
          { id: "collier", price_cents: 4500 },
          { id: "sac", price_cents: 8900 },
          { id: "carte-cadeau", price_cents: 5000 },
        ],
      },
    ],
  },
  {
    slug: "bienetre",
    emoji: "🧘",
    kind: "hybrid",
    defaultColors: { primary: "#0d9488", dark: "#0a1211", text: "#14201e" },
    families: [
      {
        id: "seances",
        services: [
          { id: "seance-decouverte", duration_min: 60, price_cents: 0 },
          { id: "seance-individuelle", duration_min: 60, price_cents: 6000 },
          { id: "bilan-complet", duration_min: 90, price_cents: 9000 },
        ],
      },
    ],
    productCategories: [
      {
        id: "forfaits-programmes",
        products: [
          { id: "forfait-5-seances", price_cents: 27000 },
          { id: "forfait-10-seances", price_cents: 50000 },
          { id: "programme-en-ligne", price_cents: 9900 },
        ],
      },
    ],
  },
  {
    slug: "autre",
    emoji: "⭐",
    kind: "service",
    defaultColors: { primary: "#d31212", dark: "#0a0a0a", text: "#1c1c1c" },
    families: [
      {
        id: "prestations",
        services: [
          { id: "rendez-vous-decouverte", duration_min: 30, price_cents: 0 },
          { id: "prestation-standard", duration_min: 60, price_cents: 5000 },
        ],
      },
    ],
  },
];

export function getVertical(slug: string): Vertical {
  return VERTICALS.find((v) => v.slug === slug) ?? VERTICALS[VERTICALS.length - 1];
}

export const FONTS: { id: string; css: string }[] = [
  { id: "fraunces", css: "'Fraunces', Georgia, serif" },
  { id: "inter", css: "'Inter', sans-serif" },
  { id: "playfair", css: "'Playfair Display', serif" },
  { id: "montserrat", css: "'Montserrat', sans-serif" },
  { id: "lora", css: "'Lora', serif" },
  { id: "cormorant", css: "'Cormorant Garamond', serif" },
  { id: "quicksand", css: "'Quicksand', sans-serif" },
  { id: "poppins", css: "'Poppins', sans-serif" },
  { id: "space-grotesk", css: "'Space Grotesk', sans-serif" },
  { id: "sora", css: "'Sora', sans-serif" },
  { id: "manrope", css: "'Manrope', sans-serif" },
  { id: "libre-baskerville", css: "'Libre Baskerville', serif" },
  { id: "dm-serif", css: "'DM Serif Display', serif" },
  { id: "marcellus", css: "'Marcellus', serif" },
  { id: "josefin", css: "'Josefin Sans', sans-serif" },
  { id: "bebas", css: "'Bebas Neue', sans-serif" },
];

export function getFont(id: string) {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

// URL Google Fonts pour la vitrine publique (chargée dynamiquement selon la police choisie)
export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@400;500;600;700&family=Lora:wght@400;500;600&family=Cormorant+Garamond:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Sora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&family=DM+Serif+Display&family=Marcellus&family=Josefin+Sans:wght@400;500;600;700&family=Bebas+Neue&display=swap";
