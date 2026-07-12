"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Coins } from "lucide-react";
import { CREDIT_PACKS, packUnitPrice } from "@/lib/credit-packs";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "./actions";

// Cartes d'achat de packs de crédits → Stripe Checkout.
// Le crédit effectif est posé par le webhook, pas au retour de redirection.
export function CreditPacks() {
  const [pendingPack, setPendingPack] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function buy(packId: string) {
    setPendingPack(packId);
    startTransition(async () => {
      const result = await createCheckoutSession(packId);
      if (result.error || !result.url) {
        toast.info(result.error ?? "Paiement indisponible. Réessaie.");
        setPendingPack(null);
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CREDIT_PACKS.map((pack) => (
        <article
          key={pack.id}
          className={`relative flex flex-col gap-1 rounded-xl border p-4 ${
            pack.featured
              ? "border-red-bright/40 bg-red-bright/5"
              : "border-border"
          }`}
        >
          {pack.discountLabel && (
            <span className="absolute right-3 top-3 rounded-full bg-red-bright/10 px-2 py-0.5 text-[10px] font-bold text-red-bright">
              {pack.discountLabel}
            </span>
          )}
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {pack.label}
          </p>
          <p className="text-3xl font-bold">
            {pack.credits}
            <span className="text-sm font-normal text-muted-foreground"> cr.</span>
          </p>
          <p className="text-sm">
            {(pack.priceCents / 100).toLocaleString("fr-FR")} €
            <span className="text-xs text-muted-foreground">
              {" "}
              · {packUnitPrice(pack)} €/cr
            </span>
          </p>
          <Button
            className="mt-2"
            variant={pack.featured ? "default" : "secondary"}
            size="sm"
            disabled={pendingPack !== null}
            onClick={() => buy(pack.id)}
          >
            <Coins aria-hidden="true" />
            {pendingPack === pack.id ? "Redirection…" : "Acheter"}
          </Button>
        </article>
      ))}
    </div>
  );
}
