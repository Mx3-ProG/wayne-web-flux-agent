import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";
import { getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { languageAlternates } from "@/lib/i18n/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "auth");
  return {
    title: dict.forgot.meta.title,
    alternates: languageAlternates(locale, "/mot-de-passe-oublie"),
  };
}

export default async function ForgotPasswordPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "auth");
  return <ForgotForm locale={locale} dict={dict.forgot} />;
}
