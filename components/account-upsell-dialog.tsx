"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { markAccountUpsellShown } from "@/app/(app)/actions";
import type { AccountStatus } from "@/lib/account-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COPY: Record<
  Exclude<AccountStatus, "subscribed">,
  { title: string; description: string }
> = {
  trial: {
    title: "Donne à FLUX les moyens d’aller plus loin",
    description:
      "Ton essai te permet de découvrir les outils IA. Une formule débloque la création complète de vitrine et recharge tes crédits chaque mois.",
  },
  trial_expired: {
    title: "Réactive ton élan avec FLUX",
    description:
      "Ton essai est terminé et ton solde est vide. Ton site reste en ligne : une formule relance les modifications, les publications et les générations IA.",
  },
  credits_active: {
    title: "Passe d’un pack ponctuel à un rythme régulier",
    description:
      "Ton pack te donne encore accès à l’IA. Une formule ajoute une recharge mensuelle et garde FLUX disponible sans attendre un nouvel achat.",
  },
  credits_expired: {
    title: "Ta fenêtre IA est terminée, pas tes crédits",
    description:
      "Tes crédits restants servent toujours à publier et gérer ta vitrine. Une formule réactive les générations IA et installe un rythme mensuel.",
  },
};

// Essai expiré avec des crédits au compteur : les modifications continuent, ce
// n'est donc pas la même promesse que le solde vide traité dans COPY.
const TRIAL_EXPIRED_WITH_CREDITS = {
  title: "Tes crédits tiennent, l’IA t’attend",
  description:
    "Ton essai est terminé, mais tes crédits restants continuent de payer tes modifications et tes publications. Une formule rouvre les générations IA et recharge ton solde chaque mois.",
};

export function AccountUpsellDialog({
  status,
  balance,
}: {
  status: Exclude<AccountStatus, "subscribed">;
  balance: number;
}) {
  const [open, setOpen] = useState(true);
  const timestamped = useRef(false);
  const copy =
    status === "trial_expired" && balance > 0
      ? TRIAL_EXPIRED_WITH_CREDITS
      : COPY[status];

  useEffect(() => {
    if (timestamped.current) return;
    timestamped.current = true;
    void markAccountUpsellShown().catch(() => {
      // Le dialogue reste utilisable si la persistance échoue. Le serveur le
      // reproposera au prochain chargement au lieu de perdre l'incitation.
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </span>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Plus tard
          </Button>
          <Button asChild>
            <Link href="/formules">Découvrir les formules</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
