import Link from "next/link";
import { FluxBrand } from "@/components/flux-brand";
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
import styles from "./legal-page.module.css";

export function LegalPage({ title, updated = "14 juillet 2026", children }: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header><Link href="/"><FluxBrand /></Link><Link href="/">Retour au site</Link></header>
      <main>
        <p className={styles.eyebrow}>Wayne Web Flux · Informations contractuelles</p>
        <h1>{title}</h1>
        <p className={styles.updated}>Dernière mise à jour : {updated}</p>
        <article>{children}</article>
      </main>
      <footer>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgv">Conditions générales</Link>
        <Link href="/confidentialite">Confidentialité</Link>
        <CookiePreferencesLink />
      </footer>
    </div>
  );
}
