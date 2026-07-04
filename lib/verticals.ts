// Verticales métiers : prestations pré-remplies, vocabulaire pour les prompts
// IA et défauts visuels de la vitrine. Tout est modifiable par le commerçant.

export type VerticalService = {
  name: string;
  duration_min: number;
  price_cents: number;
};

export type VerticalFamily = {
  name: string;
  services: VerticalService[];
};

export type Vertical = {
  slug: string;
  label: string;
  jobTitles: string[];
  emoji: string;
  clientWord: string; // "clientes", "clients", "convives"…
  promptContext: string; // injecté dans les prompts IA
  defaultColors: { primary: string; dark: string; text: string };
  families: VerticalFamily[];
};

export const VERTICALS: Vertical[] = [
  {
    slug: "beaute",
    label: "Beauté & esthétique",
    jobTitles: ["Esthéticienne", "Prothésiste ongulaire", "Technicienne de cils", "Dermographe"],
    emoji: "💅",
    clientWord: "clientes",
    promptContext:
      "Institut de beauté / esthétique : soins, ongles, cils, sourcils. Clientèle majoritairement féminine, ton chaleureux et rassurant.",
    defaultColors: { primary: "#b4886b", dark: "#1c1512", text: "#2b211c" },
    families: [
      {
        name: "Soins du visage",
        services: [
          { name: "Soin éclat", duration_min: 60, price_cents: 6500 },
          { name: "Soin anti-âge", duration_min: 75, price_cents: 8500 },
        ],
      },
      {
        name: "Ongles",
        services: [
          { name: "Pose gel", duration_min: 90, price_cents: 5500 },
          { name: "Remplissage", duration_min: 60, price_cents: 4000 },
          { name: "Vernis semi-permanent", duration_min: 45, price_cents: 3500 },
        ],
      },
      {
        name: "Cils & sourcils",
        services: [
          { name: "Extension de cils pose complète", duration_min: 120, price_cents: 9000 },
          { name: "Rehaussement de cils", duration_min: 60, price_cents: 5500 },
          { name: "Restructuration sourcils", duration_min: 30, price_cents: 2000 },
        ],
      },
    ],
  },
  {
    slug: "coiffure",
    label: "Coiffure & barbier",
    jobTitles: ["Coiffeuse", "Coiffeur", "Barbier", "Coloriste"],
    emoji: "✂️",
    clientWord: "clients",
    promptContext:
      "Salon de coiffure ou barbier : coupes, couleurs, soins capillaires. Ton dynamique et de proximité.",
    defaultColors: { primary: "#8a6d5c", dark: "#171310", text: "#241d18" },
    families: [
      {
        name: "Coupes",
        services: [
          { name: "Coupe femme", duration_min: 60, price_cents: 4500 },
          { name: "Coupe homme", duration_min: 30, price_cents: 2500 },
          { name: "Coupe + barbe", duration_min: 45, price_cents: 3500 },
        ],
      },
      {
        name: "Couleur",
        services: [
          { name: "Coloration complète", duration_min: 120, price_cents: 7500 },
          { name: "Balayage", duration_min: 150, price_cents: 9500 },
        ],
      },
    ],
  },
  {
    slug: "restaurant",
    label: "Restaurant & traiteur",
    jobTitles: ["Restaurateur", "Restauratrice", "Chef à domicile", "Traiteur"],
    emoji: "🍽️",
    clientWord: "convives",
    promptContext:
      "Restaurant, traiteur ou chef : réservation de tables ou d'événements. Ton gourmand et convivial, mise en avant des produits et du fait-maison.",
    defaultColors: { primary: "#a33b2e", dark: "#14100d", text: "#241b16" },
    families: [
      {
        name: "Réservations",
        services: [
          { name: "Table déjeuner", duration_min: 90, price_cents: 0 },
          { name: "Table dîner", duration_min: 120, price_cents: 0 },
        ],
      },
      {
        name: "Événements",
        services: [
          { name: "Privatisation (acompte)", duration_min: 240, price_cents: 15000 },
          { name: "Menu dégustation", duration_min: 150, price_cents: 6500 },
        ],
      },
    ],
  },
  {
    slug: "auto",
    label: "Automobile & garage",
    jobTitles: ["Garagiste", "Mécanicien", "Detailer auto", "Carrossier"],
    emoji: "🚗",
    clientWord: "clients",
    promptContext:
      "Garage, mécanique ou esthétique automobile. Ton direct et de confiance : transparence des prix, sérieux, délais tenus.",
    defaultColors: { primary: "#2e5aa3", dark: "#0e1116", text: "#1a1e24" },
    families: [
      {
        name: "Entretien",
        services: [
          { name: "Vidange + filtres", duration_min: 60, price_cents: 9900 },
          { name: "Révision complète", duration_min: 120, price_cents: 19900 },
          { name: "Plaquettes de frein (essieu)", duration_min: 90, price_cents: 14900 },
        ],
      },
      {
        name: "Esthétique",
        services: [
          { name: "Lavage intérieur/extérieur", duration_min: 90, price_cents: 6900 },
          { name: "Polish + céramique", duration_min: 240, price_cents: 39900 },
        ],
      },
    ],
  },
  {
    slug: "artisan",
    label: "Artisan & BTP",
    jobTitles: ["Plombier", "Électricien", "Peintre", "Menuisier", "Multi-services"],
    emoji: "🔧",
    clientWord: "clients",
    promptContext:
      "Artisan du bâtiment : dépannages et chantiers. Ton fiable et sans jargon : devis clair, ponctualité, travail soigné.",
    defaultColors: { primary: "#c07f24", dark: "#12100c", text: "#211c14" },
    families: [
      {
        name: "Interventions",
        services: [
          { name: "Diagnostic / devis à domicile", duration_min: 60, price_cents: 0 },
          { name: "Dépannage urgent", duration_min: 90, price_cents: 9000 },
          { name: "Petits travaux (à l'heure)", duration_min: 60, price_cents: 5500 },
        ],
      },
    ],
  },
  {
    slug: "autre",
    label: "Autre activité",
    jobTitles: ["Indépendant", "Indépendante"],
    emoji: "⭐",
    clientWord: "clients",
    promptContext:
      "Commerce ou activité indépendante de proximité. Ton professionnel et accessible.",
    defaultColors: { primary: "#d31212", dark: "#0a0a0a", text: "#1c1c1c" },
    families: [
      {
        name: "Prestations",
        services: [
          { name: "Rendez-vous découverte", duration_min: 30, price_cents: 0 },
          { name: "Prestation standard", duration_min: 60, price_cents: 5000 },
        ],
      },
    ],
  },
];

export function getVertical(slug: string): Vertical {
  return VERTICALS.find((v) => v.slug === slug) ?? VERTICALS[VERTICALS.length - 1];
}

export const FONTS: { id: string; label: string; css: string }[] = [
  { id: "fraunces", label: "Fraunces — éditoriale, premium (par défaut)", css: "'Fraunces', Georgia, serif" },
  { id: "inter", label: "Inter — moderne, neutre (par défaut)", css: "'Inter', sans-serif" },
  { id: "playfair", label: "Playfair Display — chic, élégante", css: "'Playfair Display', serif" },
  { id: "montserrat", label: "Montserrat — épurée, pro", css: "'Montserrat', sans-serif" },
  { id: "lora", label: "Lora — raffinée, serif douce", css: "'Lora', serif" },
  { id: "cormorant", label: "Cormorant Garamond — luxe, sophistiquée", css: "'Cormorant Garamond', serif" },
  { id: "quicksand", label: "Quicksand — ronde, douce", css: "'Quicksand', sans-serif" },
  { id: "poppins", label: "Poppins — moderne, douce", css: "'Poppins', sans-serif" },
];

export function getFont(id: string) {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

// URL Google Fonts pour la vitrine publique (chargée dynamiquement selon la police choisie)
export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@400;500;600;700&family=Lora:wght@400;500;600&family=Cormorant+Garamond:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap";
