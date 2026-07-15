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
  fluxSiteAllowed: boolean;
  lastPurchaseAt: string | null;
  aiExpiresAt: string | null;
};

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
  const [{ data: profile, error: profileError }, { data: purchase, error: purchaseError }] =
    await Promise.all([
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
    ]);

  if (profileError) throw new Error(`account_access_profile: ${profileError.message}`);
  if (purchaseError) throw new Error(`account_access_purchase: ${purchaseError.message}`);

  if (isActiveSubscriptionStatus(profile?.subscription_status)) {
    return {
      status: "subscribed",
      isSubscribed: true,
      aiAllowed: true,
      fluxSiteAllowed: true,
      lastPurchaseAt: purchase?.created_at ?? null,
      aiExpiresAt: null,
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
      fluxSiteAllowed: active,
      lastPurchaseAt: purchase.created_at,
      aiExpiresAt,
    };
  }

  const trialActive =
    !!profile?.trial_ends_at &&
    new Date(profile.trial_ends_at).getTime() > Date.now();
  return {
    status: trialActive ? "trial" : "trial_expired",
    isSubscribed: false,
    aiAllowed: trialActive,
    fluxSiteAllowed: false,
    lastPurchaseAt: null,
    aiExpiresAt: null,
  };
}
