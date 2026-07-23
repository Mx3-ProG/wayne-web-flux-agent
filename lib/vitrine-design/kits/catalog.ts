import type { PageTheme } from "@/lib/types";
import type { SectionType } from "@/lib/sections";
import type { DesignKit, DesignSlot } from "../types";

const shared = {
  footer: "footer-standard", category: "category-accordion",
  product: "product-card", cart: "cart-floating", order: "order-modal",
  booking: "booking-modal", legal: "legal-modal", checkout: "checkout-future",
} satisfies Partial<Record<DesignSlot, string>>;

const sectionTypes: SectionType[] = [
  "promo", "offres", "boutique", "prestations", "galerie", "avis", "horaires",
  "texte", "image_texte", "faq", "a_propos", "avant_apres", "carte",
  "google_business", "newsletter", "video",
];

const profiles: Record<PageTheme, Pick<DesignKit, "layoutProfile" | "rules">> = {
  editorial: { layoutProfile: "magazine", rules: { density: "spacious", radius: "small", media: "editorial", motion: "editorial" } },
  studio: { layoutProfile: "cinematic", rules: { density: "spacious", radius: "soft", media: "immersive", motion: "editorial" } },
  local: { layoutProfile: "local", rules: { density: "balanced", radius: "round", media: "contained", motion: "quiet" } },
  bold: { layoutProfile: "impact", rules: { density: "compact", radius: "small", media: "editorial", motion: "dynamic" } },
  luxe: { layoutProfile: "quiet-luxury", rules: { density: "spacious", radius: "none", media: "editorial", motion: "quiet" } },
  minimal: { layoutProfile: "minimal", rules: { density: "spacious", radius: "small", media: "contained", motion: "quiet" } },
  neon: { layoutProfile: "neon", rules: { density: "balanced", radius: "soft", media: "immersive", motion: "dynamic" } },
  prestige: { layoutProfile: "showroom", rules: { density: "spacious", radius: "none", media: "immersive", motion: "editorial" } },
  "performance-gt": { layoutProfile: "performance", rules: { density: "compact", radius: "none", media: "immersive", motion: "dynamic" } },
  "rosso-editorial": { layoutProfile: "heritage", rules: { density: "spacious", radius: "none", media: "editorial", motion: "editorial" } },
  "maison-couture": { layoutProfile: "collection", rules: { density: "balanced", radius: "none", media: "editorial", motion: "quiet" } },
};

function curatedComponents(
  choices: DesignKit["components"]
): DesignKit["compatibleComponents"] {
  const compatible = Object.fromEntries(
    Object.entries(choices).map(([slot, id]) => [slot, [id]])
  ) as DesignKit["compatibleComponents"];
  compatible.button = Array.from(new Set([choices.button, "button-pill", "button-smooth-flux"]));
  compatible.navigation = Array.from(new Set([choices.navigation, "navigation-glass", "navigation-minimal"]));
  compatible.header = Array.from(new Set([choices.header, "header-editorial", "header-centered"]));
  compatible.section = Array.from(new Set([choices.section, "section-cards", "section-flat"]));
  return compatible;
}

function kit(
  id: DesignKit["legacyTheme"], name: string, description: string,
  tags: string[], premium: boolean,
  defaults: DesignKit["defaults"],
  choices: Pick<DesignKit["components"], "button" | "navigation" | "header" | "section">,
  voiceArchetypeId: string
): DesignKit {
  const components = { ...shared, ...choices } as Record<DesignSlot, string>;
  const profile = profiles[id];
  return {
    id, legacyTheme: id, name, description, tags, premium: premium || undefined,
    version: 2, status: "stable", voiceArchetypeId, defaults,
    ...profile,
    supportedModes: ["light", "dark"],
    compatibleComponents: curatedComponents(components),
    sectionRecipes: Object.fromEntries(
      sectionTypes.map((type) => [type, `${profile.layoutProfile}-${type}`])
    ) as Record<SectionType, string>,
    components,
  };
}

export const DESIGN_KITS: DesignKit[] = [
  kit("editorial", "Éditorial", "Clair, élégant et centré sur les images.", ["clair", "image"], false, { colors: { primary: "#b9445a", dark: "#20181b", text: "#2b2225", background: "#fffaf8", card: "#ffffff", heroGradient: true }, font: "dm-serif", typography: { headingScale: "l", headingFont: "dm-serif" } }, { button: "button-pill", navigation: "navigation-glass", header: "header-editorial", section: "section-cards" }, "voice-warm"),
  kit("studio", "Studio", "Sombre, précis et cinématique.", ["sombre", "premium"], false, { colors: { primary: "#ef435e", dark: "#08080a", text: "#f5f4f6", background: "#0d0d10", card: "#17171c", heroGradient: true }, font: "sora", typography: { headingScale: "xl", headingFont: "sora" } }, { button: "button-pill", navigation: "navigation-glass", header: "header-centered", section: "section-cards" }, "voice-expert"),
  kit("local", "Local", "Chaleureux, humain et rassurant.", ["local", "humain"], false, { colors: { primary: "#9d7058", dark: "#392a23", text: "#3c2d27", background: "#f8eddf", card: "#fff8ef", heroGradient: true }, font: "lora", typography: { headingScale: "l", headingFont: "lora" } }, { button: "button-pill", navigation: "navigation-glass", header: "header-editorial", section: "section-cards" }, "voice-warm"),
  kit("bold", "Impact", "Graphique, énergique et orienté conversion.", ["impact", "conversion"], false, { colors: { primary: "#ff3d1f", dark: "#111111", text: "#111111", background: "#f4f0e8", card: "#ffffff", heroGradient: false }, font: "montserrat", typography: { headingScale: "xl", headingFont: "bebas" } }, { button: "button-square", navigation: "navigation-minimal", header: "header-impact", section: "section-cards" }, "voice-direct"),
  kit("luxe", "Luxe", "Sombre, doré et haut de gamme.", ["luxe", "doré"], true, { colors: { primary: "#c9a86a", dark: "#100d09", text: "#f5efe4", background: "#14110c", card: "#1d1913", heroGradient: true }, font: "cormorant", typography: { headingScale: "xl", headingFont: "cormorant" } }, { button: "button-outline-luxe", navigation: "navigation-glass", header: "header-centered", section: "section-cards" }, "voice-refined"),
  kit("minimal", "Minimal", "Blanc, épuré et sans superflu.", ["minimal", "clair"], true, { colors: { primary: "#141414", dark: "#101010", text: "#171717", background: "#ffffff", card: "#f5f5f3", heroGradient: false }, font: "manrope", typography: { headingScale: "l", headingFont: "manrope" } }, { button: "button-square", navigation: "navigation-minimal", header: "header-editorial", section: "section-flat" }, "voice-expert"),
  kit("neon", "Néon", "Nuit électrique et lumineuse.", ["néon", "sombre"], true, { colors: { primary: "#ff2f78", dark: "#080912", text: "#f7f4ff", background: "#0a0b12", card: "#12141d", heroGradient: true }, font: "space-grotesk", typography: { headingScale: "xl", headingFont: "space-grotesk" } }, { button: "button-pill", navigation: "navigation-glass", header: "header-centered", section: "section-glow" }, "voice-direct"),
  { ...kit("prestige", "Prestige", "Showroom sombre, sur-mesure et luxueux.", ["showroom", "luxe"], true, { colors: { primary: "#b99a64", dark: "#050505", text: "#f5f0e8", background: "#080706", card: "#12100d", heroGradient: true }, font: "marcellus", typography: { headingScale: "xl", headingFont: "marcellus" } }, { button: "button-outline-luxe", navigation: "navigation-prestige", header: "header-centered", section: "section-cards" }, "voice-refined"), components: { ...shared, button: "button-outline-luxe", navigation: "navigation-prestige", header: "header-centered", footer: "footer-prestige", section: "section-cards" } as Record<DesignSlot, string> },
  { ...kit("performance-gt", "Performance GT", "Immersif, angulaire et conçu comme une expérience automobile.", ["performance", "automobile", "cinématique"], true, { colors: { primary: "#f2c400", dark: "#090909", text: "#f5f5f2", background: "#0d0d0d", card: "#171717", heroGradient: true }, font: "montserrat", typography: { headingScale: "xl", headingFont: "bebas" } }, { button: "button-performance", navigation: "navigation-performance", header: "header-performance", section: "section-performance" }, "voice-direct"), components: { ...shared, button: "button-performance", navigation: "navigation-performance", header: "header-performance", footer: "footer-performance", section: "section-performance", category: "category-grid", product: "product-card" } as Record<DesignSlot, string> },
  { ...kit("rosso-editorial", "Rosso Editorial", "Élégant, passionné et construit comme un magazine de maison.", ["éditorial", "automobile", "héritage", "luxe"], true, { colors: { primary: "#d71920", dark: "#101010", text: "#f7f4f0", background: "#f3f0eb", card: "#ffffff", heroGradient: true }, font: "inter", typography: { headingScale: "xl", headingFont: "cormorant" } }, { button: "button-orbit", navigation: "navigation-heritage", header: "header-heritage", section: "section-editorial-mosaic" }, "voice-refined"), components: { ...shared, button: "button-orbit", navigation: "navigation-heritage", header: "header-heritage", footer: "footer-editorial", section: "section-editorial-mosaic", category: "category-grid", product: "product-minimal" } as Record<DesignSlot, string> },
  { ...kit("maison-couture", "Maison Couture", "Clair, silencieux et centré sur les collections et le service.", ["mode", "luxe", "collection", "e-commerce"], true, { colors: { primary: "#2b211c", dark: "#171513", text: "#1c1b1a", background: "#f7f6f3", card: "#f0efeb", heroGradient: false }, font: "inter", typography: { headingScale: "l", headingFont: "lora" } }, { button: "button-couture", navigation: "navigation-maison", header: "header-campaign", section: "section-collection-grid" }, "voice-refined"), components: { ...shared, button: "button-couture", navigation: "navigation-maison", header: "header-campaign", footer: "footer-maison", section: "section-collection-grid", category: "category-grid", product: "product-minimal" } as Record<DesignSlot, string> },
].map((entry) => ({
  ...entry,
  compatibleComponents: curatedComponents(entry.components),
}));

// Cinq univers n'ont jamais reçu de fond clair propre (leur `background`
// est une teinte sombre, pas une variante claire) : forcer "light" y produit
// un texte sombre sur fond sombre, illisible. Restreindre côté kit pour que
// l'éditeur masque le contrôle "Ambiance" incompatible plutôt que de laisser
// le commerçant casser son propre rendu.
const DARK_ONLY_KIT_IDS = new Set(["studio", "luxe", "neon", "prestige", "performance-gt"]);
for (const entry of DESIGN_KITS) {
  if (DARK_ONLY_KIT_IDS.has(entry.id)) entry.supportedModes = ["dark"];
}
