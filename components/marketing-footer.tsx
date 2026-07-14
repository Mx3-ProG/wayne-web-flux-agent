import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
import { FluxBrand } from "@/components/flux-brand";
import styles from "./marketing-footer.module.css";

export function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brandColumn}>
          <Link href="/" aria-label="Wayne Web Flux, accueil"><FluxBrand /></Link>
          <p>La présence digitale qui travaille vraiment pour ton commerce.</p>
          <Link className={styles.cta} href="/commencer">
            Essayer FLUX gratuitement <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>

        <nav className={styles.column} aria-label="Produit">
          <p>Produit</p>
          <Link href="/#solution">La solution</Link>
          <Link href="/#outils">Les outils</Link>
          <Link href="/pricing">Tarifs</Link>
          <Link href="/login">Connexion</Link>
        </nav>

        <nav className={styles.column} aria-label="Ressources">
          <p>Ressources</p>
          <a href="https://www.wayne-web.com/faq">Centre d’aide</a>
          <Link href="/#histoire">Notre histoire</Link>
          <a href="mailto:contact@wayne-web.com">Nous contacter</a>
        </nav>

        <nav className={styles.column} aria-label="Informations légales">
          <p>Légal</p>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgv">Conditions générales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <CookiePreferencesLink />
        </nav>
      </div>

      <p className={styles.safety}>
        Infrastructure protégée par KarlMada · Tolérance zéro pour les contenus adultes,
        drogues, armes, fraudes et activités illicites.
      </p>

      <div className={styles.bottom}>
        <span>© 2026 Wayne Web. Tous droits réservés.</span>
        <span className={styles.status}><i /> Services opérationnels</span>
        <div className={styles.socials}>
          <a href="https://www.linkedin.com/company/wayne-web" aria-label="Wayne Web sur LinkedIn"><span aria-hidden="true">in</span></a>
          <a href="https://www.instagram.com/wayneweb.fr" aria-label="Wayne Web sur Instagram"><span aria-hidden="true">ig</span></a>
        </div>
      </div>
    </footer>
  );
}
