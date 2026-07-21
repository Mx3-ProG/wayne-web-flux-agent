import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";
import { getRequestLocale } from "@/lib/i18n/locale.server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { languageAlternates } from "@/lib/i18n/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale, "legal");
  return {
    title: dict.titles.legalNotice,
    alternates: languageAlternates(locale, "/mentions-legales"),
  };
}

export default async function LegalNoticePage() {
  const locale = await getRequestLocale();
  const [legal, common] = await Promise.all([
    getDictionary(locale, "legal"),
    getDictionary(locale, "common"),
  ]);
  return <LegalPage
    title={legal.titles.legalNotice}
    locale={locale}
    chrome={legal.chrome}
    footer={common.footer}
  >
    <section><h2>Éditeur</h2><p>{COMPANY.tradeName} est édité par {COMPANY.legalName}, {COMPANY.legalForm}.<br /><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p></section>
    <section><h2>Direction de la publication</h2><p>La direction de la publication est assurée par le représentant légal de {COMPANY.legalName}.</p></section>
    <section><h2>Hébergement</h2><p>Le service est hébergé par Wayne-Web.</p></section>
    <section><h2>Propriété intellectuelle</h2><p>La structure, le logiciel, les marques, textes et éléments graphiques de Wayne Web Flux sont protégés. Toute reproduction ou exploitation non autorisée est interdite.</p></section>
    <section><h2>Contact</h2><p>Pour toute question relative au service ou au contenu du site : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p></section>
  </LegalPage>;
}
