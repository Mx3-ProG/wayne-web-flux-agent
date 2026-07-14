import type { DesignKit, DesignSlot } from "../types";

const shared = {
  footer: "footer-standard", category: "category-accordion",
  product: "product-card", cart: "cart-floating", order: "order-modal",
  booking: "booking-modal", legal: "legal-modal", checkout: "checkout-future",
} satisfies Partial<Record<DesignSlot, string>>;

function kit(
  id: DesignKit["legacyTheme"], name: string, description: string,
  tags: string[], premium: boolean,
  choices: Pick<DesignKit["components"], "button" | "navigation" | "header" | "section">,
  voiceArchetypeId: string
): DesignKit {
  return {
    id, legacyTheme: id, name, description, tags, premium: premium || undefined,
    status: "stable", voiceArchetypeId,
    components: { ...shared, ...choices } as Record<DesignSlot, string>,
  };
}

export const DESIGN_KITS: DesignKit[] = [
  kit("editorial", "Éditorial", "Clair, élégant et centré sur les images.", ["clair", "image"], false, { button: "button-pill", navigation: "navigation-glass", header: "header-editorial", section: "section-cards" }, "voice-warm"),
  kit("studio", "Studio", "Sombre, précis et cinématique.", ["sombre", "premium"], false, { button: "button-pill", navigation: "navigation-glass", header: "header-centered", section: "section-cards" }, "voice-expert"),
  kit("local", "Local", "Chaleureux, humain et rassurant.", ["local", "humain"], false, { button: "button-pill", navigation: "navigation-glass", header: "header-editorial", section: "section-cards" }, "voice-warm"),
  kit("bold", "Impact", "Graphique, énergique et orienté conversion.", ["impact", "conversion"], false, { button: "button-square", navigation: "navigation-minimal", header: "header-impact", section: "section-cards" }, "voice-direct"),
  kit("luxe", "Luxe", "Sombre, doré et haut de gamme.", ["luxe", "doré"], true, { button: "button-outline-luxe", navigation: "navigation-glass", header: "header-centered", section: "section-cards" }, "voice-refined"),
  kit("minimal", "Minimal", "Blanc, épuré et sans superflu.", ["minimal", "clair"], true, { button: "button-square", navigation: "navigation-minimal", header: "header-editorial", section: "section-flat" }, "voice-expert"),
  kit("neon", "Néon", "Nuit électrique et lumineuse.", ["néon", "sombre"], true, { button: "button-pill", navigation: "navigation-glass", header: "header-centered", section: "section-glow" }, "voice-direct"),
  { ...kit("prestige", "Prestige", "Showroom sombre, sur-mesure et luxueux.", ["showroom", "luxe"], true, { button: "button-outline-luxe", navigation: "navigation-prestige", header: "header-centered", section: "section-cards" }, "voice-refined"), components: { ...shared, button: "button-outline-luxe", navigation: "navigation-prestige", header: "header-centered", footer: "footer-prestige", section: "section-cards" } as Record<DesignSlot, string> },
];
