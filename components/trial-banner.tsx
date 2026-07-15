import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import {
  hasActiveAccess,
  isActiveSubscriptionStatus,
  trialDaysLeft,
} from "@/lib/plans";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Pick<Profile, "trial_ends_at" | "subscription_status">;
};

// Bandeau d'état de l'essai FLUX, affiché sous le header de l'app.
// Souscrit → rien. Essai en cours → compte à rebours. Essai expiré → lecture
// seule (les actions à crédits sont bloquées côté SQL), CTA vers /formules.
export function TrialBanner({ profile }: Props) {
  if (isActiveSubscriptionStatus(profile.subscription_status)) return null;

  const active = hasActiveAccess(profile);
  const days = trialDaysLeft(profile);

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-xs ${
        active
          ? "bg-primary/10 text-foreground"
          : "bg-destructive/15 text-foreground"
      }`}
    >
      {active ? (
        <>
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          <span>
            Essai FLUX : {days} jour{days > 1 ? "s" : ""} restant
            {days > 1 ? "s" : ""} pour tout tester.
          </span>
          <Link href="/formules" className="font-semibold underline underline-offset-4">
            Voir les formules
          </Link>
        </>
      ) : (
        <>
          <Lock aria-hidden="true" className="h-3.5 w-3.5" />
          <span>
            Essai terminé — ton site reste en ligne, mais publications et IA
            sont en pause.
          </span>
          <Link href="/formules" className="font-semibold underline underline-offset-4">
            Choisir ma formule FLUX
          </Link>
        </>
      )}
    </div>
  );
}
