import type { PageTheme } from "@/lib/types";
import { DESIGN_KITS } from "@/lib/vitrine-design/kits/catalog";

export const VITRINE_THEMES: {
  id: PageTheme;
  name: string;
  description: string;
  premium?: boolean;
}[] = DESIGN_KITS.map((kit) => ({
  id: kit.legacyTheme,
  name: kit.name,
  description: kit.description,
  premium: kit.premium,
}));
