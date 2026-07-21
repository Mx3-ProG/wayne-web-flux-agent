import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { languageAlternates } from "@/lib/i18n/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "auth");
  return {
    title: dict.login.meta.title,
    alternates: languageAlternates(locale, "/login"),
  };
}

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "auth");
  return <LoginForm locale={locale} dict={dict.login} />;
}
