import type { DesignKit, DesignSlot } from "../types";

const shared = {
  footer: "footer-standard", category: "category-accordion",
  product: "product-card", cart: "cart-floating", order: "order-modal",
  booking: "booking-modal", legal: "legal-modal", checkout: "checkout-future",
} satisfies Partial<Record<DesignSlot, string>>;

function kit(
  id: DesignKit["legacyTheme"], name: string, description: string,
  tags: string[], premium: boolean,
  defaults: DesignKit["defaults"],
  choices: Pick<DesignKit["components"], "button" | "navigation" | "header" | "section">,
  voiceArchetypeId: string
): DesignKit {
  return {
    id, legacyTheme: id, name, description, tags, premium: premium || undefined,
    status: "stable", voiceArchetypeId, defaults,
    components: { ...shared, ...choices } as Record<DesignSlot, string>,
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
];
