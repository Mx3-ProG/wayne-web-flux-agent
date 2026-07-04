"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket } from "lucide-react";
import { publishPage } from "@/app/(app)/ma-page/actions";
import { PUBLISH_COST } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  pageId: string;
  balance: number;
  hasDraft: boolean;
  nextVersion: number;
};

// Publier une nouvelle version du site : confirmation obligatoire, coût
// affiché (5 crédits ≈ 5 €), débit atomique côté SQL (publish_page).
// C'est la seule porte de sortie du brouillon vers la vitrine publique.
export function PublishButton({ pageId, balance, hasDraft, nextVersion }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [pending, startTransition] = useTransition();

  const enough = balance >= PUBLISH_COST;

  function confirm() {
    startTransition(async () => {
      const result = await publishPage(pageId);
      if (result.error === "insufficient_credits") {
        setOutOfCredits(true);
        return;
      }
      if (result.error === "nothing_to_publish") {
        setOpen(false);
        toast.info("Rien à publier : ton site est déjà à jour.");
        router.refresh();
        return;
      }
      if (result.error) {
        toast.error("Publication impossible. Réessaie dans un instant.");
        return;
      }
      setOpen(false);
      toast.success(
        `Version ${nextVersion} publiée ! Ton site est à jour. Solde : ${result.balance} cr.`
      );
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setOutOfCredits(false);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={!hasDraft} title={hasDraft ? undefined : "Aucune modification à publier"}>
          <Rocket aria-hidden="true" /> Publier ma nouvelle version
        </Button>
      </DialogTrigger>
      <DialogContent>
        {outOfCredits || !enough ? (
          <>
            <DialogHeader>
              <DialogTitle>Plus assez de crédits</DialogTitle>
              <DialogDescription>
                Publier une nouvelle version coûte {PUBLISH_COST} crédits et il
                t&apos;en reste {balance}. Tes modifications sont bien
                enregistrées en brouillon — elles t&apos;attendent.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Les formules FLUX rechargent de 500 à 5000 crédits par mois pour
              continuer à faire vivre ton site.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Plus tard</Button>
              </DialogClose>
              <Button asChild variant="secondary">
                <Link href="/credits">Voir mes crédits</Link>
              </Button>
              <Button asChild>
                <Link href="/formules">Découvrir les formules</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Publier la version {nextVersion} de ton site ?</DialogTitle>
              <DialogDescription>
                Tes modifications passent en ligne, visibles par tes clients.
                Chaque publication mobilise nos serveurs : elle coûte{" "}
                {PUBLISH_COST} crédits (≈ {PUBLISH_COST} €).
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Ton solde</span>
              <span>
                {balance} cr. → <strong>{balance - PUBLISH_COST} cr.</strong>
              </span>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Pas maintenant</Button>
              </DialogClose>
              <Button onClick={confirm} disabled={pending}>
                {pending ? "Publication…" : `Publier (${PUBLISH_COST} cr.)`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
