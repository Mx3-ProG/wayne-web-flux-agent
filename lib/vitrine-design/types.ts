import type { PageAppearance, PageColors, PageTheme, PageTypography } from "@/lib/types";
import type { SectionType } from "@/lib/sections";

export const DESIGN_SLOTS = [
  "button", "navigation", "header", "footer", "section", "category",
  "product", "cart", "order", "booking", "legal", "checkout",
] as const;

export type DesignSlot = (typeof DESIGN_SLOTS)[number];
export type DesignStatus = "stable" | "experimental";

export type DesignEntry = {
  id: string;
  slot: DesignSlot;
  name: string;
  description: string;
  preview: string;
  tags: string[];
  status: DesignStatus;
  premium?: boolean;
  capabilities: string[];
  compatibleKits?: string[];
  renderId: string;
};

export type VoiceArchetype = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  status: DesignStatus;
  prompt: string;
  examples: string[];
};

export type DesignKit = {
  id: string;
  legacyTheme: PageTheme;
  name: string;
  description: string;
  tags: string[];
  status: DesignStatus;
  premium?: boolean;
  version: 2;
  layoutProfile: "magazine" | "cinematic" | "local" | "impact" | "quiet-luxury" | "minimal" | "neon" | "showroom" | "performance" | "heritage" | "collection";
  supportedModes: Array<PageAppearance["mode"]>;
  compatibleComponents: Record<DesignSlot, string[]>;
  sectionRecipes: Record<SectionType, string>;
  rules: {
    density: "compact" | "balanced" | "spacious";
    radius: "none" | "small" | "soft" | "round";
    media: "contained" | "editorial" | "immersive";
    motion: "quiet" | "editorial" | "dynamic";
  };
  defaults: {
    colors: Required<PageColors>;
    font: string;
    typography: Required<PageTypography>;
  };
  components: Record<DesignSlot, string>;
  voiceArchetypeId: string;
};

export type VitrineDesignConfig = {
  kitId: string;
  components?: Partial<Record<DesignSlot, string>>;
  voiceArchetypeId?: string;
};

export type ResolvedVitrineDesign = {
  kit: DesignKit;
  components: Record<DesignSlot, DesignEntry>;
  voice: VoiceArchetype;
};

export type StorefrontTokens = {
  background: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  accentText: string;
  hero: string;
  navigation: string;
  footer: string;
};

export type ResolvedStorefrontPresentation = ResolvedVitrineDesign & {
  version: 2;
  appearance: PageAppearance;
  tokens: StorefrontTokens;
  warnings: string[];
  sectionRecipes: Record<SectionType, string>;
};
