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
import { useI18n } from "@/components/i18n-provider";

type UpsellCopyKey = Exclude<AccountStatus, "subscribed" | "suspended"> | "trial_expired_with_credits";
type UpsellCopyDictKey =
  | "trial"
  | "trialExpired"
  | "creditsActive"
  | "creditsExpired"
  | "trialExpiredWithCredits";

const COPY_KEY: Record<UpsellCopyKey, UpsellCopyDictKey> = {
  trial: "trial",
  trial_expired: "trialExpired",
  credits_active: "creditsActive",
  credits_expired: "creditsExpired",
  trial_expired_with_credits: "trialExpiredWithCredits",
};

export function AccountUpsellDialog({
  status,
  balance,
}: {
  status: Exclude<AccountStatus, "subscribed" | "suspended">;
  balance: number;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.upsellDialog;
  const [open, setOpen] = useState(true);
  const timestamped = useRef(false);
  // Essai expiré avec des crédits au compteur : tout tourne encore, ce n'est
  // donc pas la même promesse que le solde vide (trialExpired).
  const copyKey: UpsellCopyKey =
    status === "trial_expired" && balance > 0 ? "trial_expired_with_credits" : status;
  const copy = t[COPY_KEY[copyKey]];

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
            {t.later}
          </Button>
          <Button asChild>
            <Link href="/formules">{t.discoverPlans}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
