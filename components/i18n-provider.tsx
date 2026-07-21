"use client";

import { createContext, useContext, useEffect } from "react";
import { isRtl, type Locale } from "@/lib/i18n/config";
import type { DashboardDict, EditorDict, OffersDict, ProductsDict } from "@/lib/i18n/get-dictionary";
import type { LocalizedVertical, LocalizedFont } from "@/lib/verticals-i18n";
import type { PageTemplateMeta } from "@/lib/page-templates-i18n";

type I18nValue = {
  locale: Locale;
  dictionary: DashboardDict;
  editor: EditorDict;
  offers: OffersDict;
  products: ProductsDict;
  verticals: LocalizedVertical[];
  fonts: LocalizedFont[];
  pageTemplates: PageTemplateMeta[];
  // Vrai tant que le compte n'a aucune boutique : changer de langue principale
  // est alors gratuit (aligné sur la RPC change_account_locale). Passe à faux
  // dès la première page, où le changement re-traduit la vitrine et coûte 25 cr.
  languageChangeFree: boolean;
};
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  editor,
  offers,
  products,
  verticals,
  fonts,
  pageTemplates,
  languageChangeFree,
  children,
}: I18nValue & { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);
  return (
    <I18nContext.Provider
      value={{ locale, dictionary, editor, offers, products, verticals, fonts, pageTemplates, languageChangeFree }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
