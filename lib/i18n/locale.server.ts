import "server-only";
import { cookies, headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultLocale, hasLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Locale résolue par proxy.ts (header x-locale). Le proxy réécrit
 * /en/pricing → /pricing en posant ce header ; sans lui, on est sur une
 * URL française classique.
 */
export async function getRequestLocale(): Promise<Locale> {
  const value = (await headers()).get("x-locale");
  return value && hasLocale(value) ? value : defaultLocale;
}

/**
 * Le dashboard n'a pas de préfixe de langue. La préférence persistée dans le
 * profil est donc la source de vérité, puis le cookie assure la continuité
 * pendant la création/réparation éventuelle du profil.
 */
export async function getAccountLocale(
  supabase: SupabaseClient,
  userId: string
): Promise<Locale> {
  const { data } = await supabase
    .from("profiles")
    .select("locale")
    .eq("user_id", userId)
    .maybeSingle<{ locale: string | null }>();
  if (data?.locale && hasLocale(data.locale)) return data.locale;

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  return cookieLocale && hasLocale(cookieLocale) ? cookieLocale : defaultLocale;
}
