"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { ACCOUNT_LANGUAGE_CHANGE_COST } from "@/lib/plans";

export async function setDashboardLocale(locale: string) {
  if (!hasLocale(locale)) return { error: "invalid_locale" as const };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const };

  const { data: balance, error } = await supabase.rpc("change_account_locale", {
    target_locale: locale,
  });
  if (error?.message.includes("insufficient_credits")) {
    return { error: "insufficient_credits" as const, cost: ACCOUNT_LANGUAGE_CHANGE_COST };
  }
  if (error) return { error: "save_failed" as const };

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { balance: balance ?? undefined };
}
