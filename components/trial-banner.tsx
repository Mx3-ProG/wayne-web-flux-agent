import Link from "next/link";
import { Sparkles, Lock, Coins } from "lucide-react";
import {
  hasActiveAccess,
  isActiveSubscriptionStatus,
  trialDaysLeft,
} from "@/lib/plans";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Pick<Profile, "trial_ends_at" | "subscription_status">;
  balance: number;
};

// Bandeau d'état de l'essai FLUX, affiché sous le header de l'app.
// Souscrit → rien. Essai en cours → compte à rebours. Essai expiré avec des
// crédits → tout continue de tourner, le crédit étant la seule limite. Essai
// expiré et solde vide → lecture seule (bloqué côté SQL). Dans tous les cas
// non souscrits, le CTA mène à /formules.
export function TrialBanner({ profile, balance }: Props) {
  if (isActiveSubscriptionStatus(profile.subscription_status)) return null;

  const active = hasActiveAccess(profile);
  const days = trialDaysLeft(profile);
  const hasCredits = balance > 0;

  if (active) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary/10 px-4 py-2 text-xs text-foreground">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
        <span>
          Essai FLUX : {days} jour{days > 1 ? "s" : ""} restant
          {days > 1 ? "s" : ""} pour tout tester.
        </span>
        <Link href="/formules" className="font-semibold underline underline-offset-4">
          Voir les formules
        </Link>
      </div>
    );
  }

  if (hasCredits) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary/10 px-4 py-2 text-xs text-foreground">
        <Coins aria-hidden="true" className="h-3.5 w-3.5" />
        <span>
          Tu as terminé ton essai — tes {balance} crédit
          {balance > 1 ? "s" : ""} restant{balance > 1 ? "s" : ""} font toujours
          tourner FLUX. Recharge pour en profiter à 100 %.
        </span>
        <Link href="/formules" className="font-semibold underline underline-offset-4">
          Voir les formules
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-destructive/15 px-4 py-2 text-xs text-foreground">
      <Lock aria-hidden="true" className="h-3.5 w-3.5" />
      <span>
        Essai terminé et solde vide — ton site reste en ligne, mais les
        modifications sont en pause.
      </span>
      <Link href="/formules" className="font-semibold underline underline-offset-4">
        Choisir ma formule FLUX
      </Link>
    </div>
  );
}
