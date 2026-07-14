import type { PageTheme } from "@/lib/types";

export const VITRINE_THEMES: {
  id: PageTheme;
  name: string;
  description: string;
  premium?: boolean;
}[] = [
  { id: "editorial", name: "Éditorial", description: "Clair, élégant et centré sur les images." },
  { id: "studio", name: "Studio", description: "Sombre, précis et très premium." },
  { id: "local", name: "Local", description: "Chaleureux, humain et rassurant." },
  { id: "bold", name: "Impact", description: "Graphique, énergique et orienté conversion." },
  { id: "luxe", name: "Luxe", description: "Sombre, doré et haut de gamme.", premium: true },
  { id: "minimal", name: "Minimal", description: "Blanc, épuré, rien de superflu.", premium: true },
  { id: "neon", name: "Néon", description: "Nuit électrique, lumineux et audacieux.", premium: true },
  { id: "prestige", name: "Prestige", description: "Showroom sombre, sur-mesure et luxueux.", premium: true },
];
