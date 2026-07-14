// Packs de crédits à l'achat (Stripe Checkout). Prix public de référence :
// 1 crédit = 0,40 € — les packs supérieurs sont dégressifs. Les prix vivent
// ici uniquement (price_data inline côté Stripe, pas de Products/Prices à
// créer dans le dashboard).

export type CreditPack = {
  id: string;
  credits: number;
  priceCents: number;
  label: string;
  // Remise affichée vs le tarif de base 0,40 €/cr (null = plein tarif).
  discountLabel: string | null;
  featured: boolean;
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack50",
    credits: 50,
    priceCents: 2000, // 0,40 €/cr
    label: "Pack Découverte",
    discountLabel: null,
    featured: false,
  },
  {
    id: "pack150",
    credits: 150,
    priceCents: 5400, // 0,36 €/cr
    label: "Pack Momentum",
    discountLabel: "-10 %",
    featured: true,
  },
  {
    id: "pack400",
    credits: 400,
    priceCents: 12000, // 0,30 €/cr
    label: "Pack Empire",
    discountLabel: "-25 %",
    featured: false,
  },
];

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === id);
}

const PACK_PRICE_ENV: Record<string, string> = {
  pack50: "STRIPE_PRICE_CREDITS_PACK50",
  pack150: "STRIPE_PRICE_CREDITS_PACK150",
  pack400: "STRIPE_PRICE_CREDITS_PACK400",
};

export function stripeCreditPriceId(packId: string): string | null {
  const envName = PACK_PRICE_ENV[packId];
  return envName ? process.env[envName] || null : null;
}

export function packUnitPrice(pack: CreditPack): string {
  return (pack.priceCents / pack.credits / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
