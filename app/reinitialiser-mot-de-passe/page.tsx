import type { Metadata } from "next";
import { ResetForm } from "./reset-form";
import { getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { languageAlternates } from "@/lib/i18n/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "auth");
  return {
    title: dict.reset.meta.title,
    alternates: languageAlternates(locale, "/reinitialiser-mot-de-passe"),
  };
}

export default async function ResetPasswordPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "auth");
  return <ResetForm locale={locale} dict={dict.reset} />;
}
