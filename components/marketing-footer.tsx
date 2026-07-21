import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
import { FluxBrand } from "@/components/flux-brand";
import { localeHref, defaultLocale, type Locale } from "@/lib/i18n/config";
import type { CommonDict } from "@/lib/i18n/get-dictionary";
import styles from "./marketing-footer.module.css";

export function MarketingFooter({
  locale = defaultLocale,
  dict,
}: {
  locale?: Locale;
  dict: CommonDict;
}) {
  const href = (path: string) => localeHref(locale, path);

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brandColumn}>
          <Link href={href("/")} aria-label={dict.brandHomeAria}><FluxBrand /></Link>
          <p>{dict.footer.tagline}</p>
          <Link className={`flux-button-smooth ${styles.cta}`} href="/commencer">
            {dict.footer.cta} <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>

        <nav className={styles.column} aria-label={dict.footer.product}>
          <p>{dict.footer.product}</p>
          <Link href={`${href("/")}#solution`}>{dict.nav.solution}</Link>
          <Link href={`${href("/")}#outils`}>{dict.nav.tools}</Link>
          <Link href={href("/pricing")}>{dict.nav.pricing}</Link>
          <Link href={href("/login")}>{dict.nav.login}</Link>
        </nav>

        <nav className={styles.column} aria-label={dict.footer.resources}>
          <p>{dict.footer.resources}</p>
          <a href="https://www.wayne-web.com/faq">{dict.footer.helpCenter}</a>
          <Link href={`${href("/")}#histoire`}>{dict.nav.story}</Link>
          <a href="mailto:contact@wayne-web.com">{dict.footer.contactUs}</a>
        </nav>

        <nav className={styles.column} aria-label={dict.footer.legal}>
          <p>{dict.footer.legal}</p>
          <Link href={href("/mentions-legales")}>{dict.footer.legalNotice}</Link>
          <Link href={href("/cgv")}>{dict.footer.terms}</Link>
          <Link href={href("/confidentialite")}>{dict.footer.privacy}</Link>
          <CookiePreferencesLink />
        </nav>
      </div>

      <p className={styles.safety}>{dict.footer.safety}</p>

      <div className={styles.bottom}>
        <span>{dict.footer.rights}</span>
        <span className={styles.status}><i /> {dict.footer.status}</span>
        <div className={styles.socials}>
          <a href="https://www.linkedin.com/company/wayne-web" aria-label={dict.footer.linkedinAria}><span aria-hidden="true">in</span></a>
          <a href="https://www.instagram.com/wayneweb.fr" aria-label={dict.footer.instagramAria}><span aria-hidden="true">ig</span></a>
        </div>
      </div>
    </footer>
  );
}
