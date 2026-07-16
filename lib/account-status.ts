import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isActiveSubscriptionStatus } from "@/lib/plans";

export type AccountStatus =
  | "subscribed"
  | "credits_active"
  | "credits_expired"
  | "trial"
  | "trial_expired";

export const CREDITS_AI_WINDOW_MONTHS = 6;

export type AccountAccess = {
  status: AccountStatus;
  isSubscribed: boolean;
  aiAllowed: boolean;
  lastPurchaseAt: string | null;
  aiExpiresAt: string | null;
  creditBalance: number;
};

export function isAccountUpsellDue(lastShownAt: string | null): boolean {
  return (
    !lastShownAt ||
    new Date(lastShownAt).getTime() <= Date.now() - 12 * 60 * 60 * 1000
  );
}

function addUtcMonths(isoDate: string, months: number): string {
  const source = new Date(isoDate);
  const day = source.getUTCDate();
  const result = new Date(source);

  // Évite que le 31 + 6 mois déborde dans le mois suivant : l'échéance tombe
  // le dernier jour du mois cible, comme une échéance civile habituelle.
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result.toISOString();
}

export async function loadAccountAccess(userId: string): Promise<AccountAccess> {
  const admin = createAdminClient();
  const [
    { data: profile, error: profileError },
    { data: purchase, error: purchaseError },
    { data: balance, error: balanceError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("trial_ends_at, subscription_status")
      .eq("user_id", userId)
      .maybeSingle<{
        trial_ends_at: string | null;
        subscription_status: string | null;
      }>(),
    admin
      .from("credit_purchases")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>(),
    admin.rpc("credit_balance", { uid: userId }),
  ]);

  if (profileError) throw new Error(`account_access_profile: ${profileError.message}`);
  if (purchaseError) throw new Error(`account_access_purchase: ${purchaseError.message}`);
  if (balanceError) throw new Error(`account_access_balance: ${balanceError.message}`);

  const creditBalance = typeof balance === "number" ? balance : 0;

  if (isActiveSubscriptionStatus(profile?.subscription_status)) {
    return {
      status: "subscribed",
      isSubscribed: true,
      aiAllowed: true,
      lastPurchaseAt: purchase?.created_at ?? null,
      aiExpiresAt: null,
      creditBalance,
    };
  }

  if (purchase?.created_at) {
    const aiExpiresAt = addUtcMonths(
      purchase.created_at,
      CREDITS_AI_WINDOW_MONTHS
    );
    const active = new Date(aiExpiresAt).getTime() > Date.now();
    return {
      status: active ? "credits_active" : "credits_expired",
      isSubscribed: false,
      aiAllowed: active,
      lastPurchaseAt: purchase.created_at,
      aiExpiresAt,
      creditBalance,
    };
  }

  // Un état Stripe inactif (canceled, unpaid…) ne doit jamais retomber sur
  // l'essai, même si trial_ends_at est encore dans le futur. On ne consulte
  // pas subscribed_at : subscription_status suffit et est maintenu à jour.
  const trialActive =
    !profile?.subscription_status &&
    !!profile?.trial_ends_at &&
    new Date(profile.trial_ends_at).getTime() > Date.now();
  // Essai expiré : le solde prend le relais. Tant qu'il reste des crédits, tout
  // reste ouvert (IA comprise) — le crédit est la seule limite, et son débit
  // reste arbitré par spend_credits côté SQL. Solde vide = lecture seule.
  return {
    status: trialActive ? "trial" : "trial_expired",
    isSubscribed: false,
    aiAllowed: trialActive || creditBalance > 0,
    lastPurchaseAt: null,
    aiExpiresAt: null,
    creditBalance,
  };
}
