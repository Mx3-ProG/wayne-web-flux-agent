import Link from "next/link";
import { FluxBrand } from "@/components/flux-brand";
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
import { localeHref, defaultLocale, type Locale } from "@/lib/i18n/config";
import type { CommonDict, LegalDict } from "@/lib/i18n/get-dictionary";
import styles from "./legal-page.module.css";

export function LegalPage({
  title,
  updated = "14 juillet 2026",
  locale = defaultLocale,
  chrome,
  footer,
  children,
}: {
  title: string;
  updated?: string;
  locale?: Locale;
  chrome: LegalDict["chrome"];
  footer: Pick<CommonDict["footer"], "legalNotice" | "terms" | "privacy">;
  children: React.ReactNode;
}) {
  const href = (path: string) => localeHref(locale, path);

  return (
    <div className={styles.page}>
      <header><Link href={href("/")}><FluxBrand /></Link><Link href={href("/")}>{chrome.backToSite}</Link></header>
      <main>
        <p className={styles.eyebrow}>{chrome.eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.updated}>{chrome.lastUpdated} {updated}</p>
        {locale !== defaultLocale && chrome.frenchOnlyNotice && (
          <p className={styles.updated}>{chrome.frenchOnlyNotice}</p>
        )}
        <article>{children}</article>
      </main>
      <footer>
        <Link href={href("/mentions-legales")}>{footer.legalNotice}</Link>
        <Link href={href("/cgv")}>{footer.terms}</Link>
        <Link href={href("/confidentialite")}>{footer.privacy}</Link>
        <CookiePreferencesLink />
      </footer>
    </div>
  );
}
