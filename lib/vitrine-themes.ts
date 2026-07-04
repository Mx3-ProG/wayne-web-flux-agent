import type { PageTheme } from "@/lib/types";

export const VITRINE_THEMES: {
  id: PageTheme;
  name: string;
  description: string;
}[] = [
  { id: "editorial", name: "Éditorial", description: "Clair, élégant et centré sur les images." },
  { id: "studio", name: "Studio", description: "Sombre, précis et très premium." },
  { id: "local", name: "Local", description: "Chaleureux, humain et rassurant." },
  { id: "bold", name: "Impact", description: "Graphique, énergique et orienté conversion." },
];
