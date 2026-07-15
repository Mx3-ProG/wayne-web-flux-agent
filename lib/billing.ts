import "server-only";
import type Stripe from "stripe";
import type { Plan } from "@/lib/types";
import { PLAN_LIMITS, planFromStripePrice } from "@/lib/plans";
export { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/plans";

export function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function subscriptionSnapshot(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: stripeId(subscription.customer),
    stripe_price_id: priceId,
    subscription_status: subscription.status,
    current_period_end: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    plan: priceId ? planFromStripePrice(priceId) : null,
  };
}

export function monthlyCreditsForPrice(priceId: string): { plan: Plan; credits: number } | null {
  const plan = planFromStripePrice(priceId);
  return plan ? { plan, credits: PLAN_LIMITS[plan].monthlyCredits } : null;
}
