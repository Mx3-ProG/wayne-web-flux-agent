import type { PageTheme } from "@/lib/types";

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
