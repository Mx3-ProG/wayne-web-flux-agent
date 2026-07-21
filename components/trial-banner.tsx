"use client";

import Link from "next/link";
import { Sparkles, Lock, Coins } from "lucide-react";
import {
  hasActiveAccess,
  isActiveSubscriptionStatus,
  trialDaysLeft,
} from "@/lib/plans";
import type { Profile } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";

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
  const { dictionary } = useI18n();
  const t = dictionary.trialBanner;
  if (isActiveSubscriptionStatus(profile.subscription_status)) return null;

  const active = hasActiveAccess(profile);
  const days = trialDaysLeft(profile);
  const hasCredits = balance > 0;

  if (active) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary/10 px-4 py-2 text-xs text-foreground">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
        <span>
          {(days > 1 ? t.activePlural : t.activeSingular).replace("{days}", String(days))}
        </span>
        <Link href="/formules" className="font-semibold underline underline-offset-4">
          {t.viewPlans}
        </Link>
      </div>
    );
  }

  if (hasCredits) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary/10 px-4 py-2 text-xs text-foreground">
        <Coins aria-hidden="true" className="h-3.5 w-3.5" />
        <span>
          {(balance > 1 ? t.creditsActivePlural : t.creditsActiveSingular).replace(
            "{credits}",
            String(balance)
          )}
        </span>
        <Link href="/formules" className="font-semibold underline underline-offset-4">
          {t.viewPlans}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-destructive/15 px-4 py-2 text-xs text-foreground">
      <Lock aria-hidden="true" className="h-3.5 w-3.5" />
      <span>{t.expiredNoCredits}</span>
      <Link href="/formules" className="font-semibold underline underline-offset-4">
        {t.choosePlan}
      </Link>
    </div>
  );
}
