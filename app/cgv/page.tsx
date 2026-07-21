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
    title: dict.titles.terms,
    alternates: languageAlternates(locale, "/cgv"),
  };
}

export default async function TermsPage() {
  const locale = await getRequestLocale();
  const [legal, common] = await Promise.all([
    getDictionary(locale, "legal"),
    getDictionary(locale, "common"),
  ]);
  return <LegalPage
    title={legal.titles.terms}
    locale={locale}
    chrome={legal.chrome}
    footer={common.footer}
  >
    <section><h2>1. Objet et clientèle</h2><p>Les présentes conditions encadrent l’utilisation de Wayne Web Flux et l’achat de ses abonnements et crédits. Le service est destiné aux professionnels agissant pour les besoins de leur activité. Toute commande implique leur acceptation.</p></section>
    <section><h2>2. Service</h2><p>Wayne Web Flux fournit des outils de création de vitrine, de gestion commerciale et d’assistance par intelligence artificielle. Les résultats générés doivent être relus et validés par l’utilisateur avant publication.</p></section>
    <section><h2>3. Essai</h2><p>Un essai de 7 jours et 100 crédits de bienvenue peuvent être accordés sans carte bancaire. À son expiration, aucune souscription n’est déclenchée automatiquement. Certaines actions deviennent indisponibles jusqu’au choix d’une formule payante.</p></section>
    <section><h2>4. Abonnements</h2><p>Les formules Basique, Pro, Business et Entreprise sont facturées mensuellement aux tarifs affichés lors de la commande. L’abonnement débute dès la confirmation du paiement et se renouvelle automatiquement chaque mois jusqu’à résiliation. Le prix, les crédits inclus et les fonctionnalités sont récapitulés avant paiement.</p></section>
    <section><h2>5. Crédits</h2><p>Les crédits inclus sont ajoutés après paiement de chaque facture mensuelle : 20 pour Basique, 100 pour Pro, 300 pour Business et 500 pour Entreprise. Les packs additionnels, leurs quantités et leurs prix sont ceux affichés sur la page Crédits lors de la commande. Les crédits non utilisés restent cumulés tant que le compte existe. Ils ne constituent ni une monnaie, ni un avoir transférable, et ne sont pas convertibles en argent.</p></section>
    <section><h2>6. Paiement et factures</h2><p>Les paiements sont traités par Stripe. Les prix sont affichés en euros avec leur régime de taxe applicable. Le client peut consulter ses factures et mettre à jour son moyen de paiement depuis le portail de facturation sécurisé.</p></section>
    <section><h2>7. Changement et résiliation</h2><p>Le client peut gérer ou résilier son abonnement depuis son espace de facturation. Sauf indication différente affichée dans le portail, la résiliation prend effet à la fin de la période déjà payée. Un changement de formule suit les règles de date d’effet et de prorata présentées par Stripe avant confirmation.</p></section>
    <section><h2>8. Impayés</h2><p>En cas d’échec de paiement, des relances peuvent être effectuées. L’accès peut être maintenu pendant une courte période de régularisation, puis suspendu si la facture reste impayée.</p></section>
    <section><h2>9. Remboursements</h2><p>Sauf obligation légale contraire, les périodes d’abonnement commencées et les packs de crédits déjà attribués ne sont pas remboursables. En cas d’erreur de facturation ou d’indisponibilité substantielle imputable au service, le client peut écrire à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> afin qu’une solution adaptée soit examinée.</p></section>
    <section><h2>10. Responsabilité et disponibilité</h2><p>Le service est fourni avec diligence, sans garantie d’absence totale d’interruption. Le client reste responsable de ses contenus, de leur licéité, de leurs sauvegardes et des décisions prises à partir des résultats générés.</p></section>
    <section><h2>11. Contenus et activités strictement interdits</h2><p>FLUX applique une tolérance zéro aux contenus, offres, produits, services et transactions liés à la pornographie ou aux services pour adultes, aux drogues et substances illicites, aux armes, à la fraude, à la contrefaçon, à la violence criminelle, ainsi qu’à toute activité contraire aux lois et règlements applicables. Cette interdiction vaut dans les textes, images, liens, prompts adressés à l’intelligence artificielle, brouillons et contenus publiés.</p><p>Le dispositif de protection « KarlMada » peut analyser automatiquement les saisies, bloquer une création, une publication ou une opération suspecte et conserver un journal technique minimal du blocage. Une opération payante refusée par KarlMada reste débitée et ne donne lieu à aucun remboursement. Chaque refus constitue une infraction aux présentes conditions ; à la troisième infraction, le compte est supprimé. Aucun droit à publier ou vendre un contenu interdit n’est accordé, sans préjudice d’un signalement aux autorités lorsque la loi l’exige.</p></section>
    <section><h2>12. Droit applicable</h2><p>Les présentes conditions sont soumises au droit français. Les parties rechercheront une solution amiable avant tout recours. À défaut, le litige relève des juridictions compétentes selon les règles applicables.</p></section>
  </LegalPage>;
}
