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
    title: dict.titles.privacy,
    alternates: languageAlternates(locale, "/confidentialite"),
  };
}

export default async function PrivacyPage() {
  const locale = await getRequestLocale();
  const [legal, common] = await Promise.all([
    getDictionary(locale, "legal"),
    getDictionary(locale, "common"),
  ]);
  return <LegalPage
    title={legal.titles.privacy}
    locale={locale}
    chrome={legal.chrome}
    footer={common.footer}
  >
    <section><h2>Responsable du traitement</h2><p>{COMPANY.legalName} traite les données nécessaires au fonctionnement de Wayne Web Flux. Contact : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p></section>
    <section><h2>Données traitées</h2><p>Nous pouvons traiter les données de compte et de profil professionnel, les contenus saisis, l’historique d’utilisation et de crédits, les données techniques de sécurité, ainsi que les références de facturation. Les données complètes de carte bancaire sont collectées et conservées par Stripe, pas par Wayne Web Flux.</p></section>
    <section><h2>Finalités et bases</h2><ul><li>Créer et sécuriser le compte, exécuter le contrat et fournir les fonctionnalités.</li><li>Traiter les paiements, factures, abonnements et demandes d’assistance.</li><li>Prévenir les abus et améliorer la fiabilité sur la base de notre intérêt légitime.</li><li>Respecter les obligations comptables, fiscales et légales.</li></ul></section>
    <section><h2>Destinataires</h2><p>Les données sont accessibles aux personnes habilitées et aux prestataires nécessaires au service, notamment Supabase pour les données applicatives, Stripe pour les paiements, Vercel pour l’hébergement et les fournisseurs d’intelligence artificielle lorsque l’utilisateur lance une génération.</p></section>
    <section><h2>Durées</h2><p>Les données du compte sont conservées pendant la relation contractuelle puis pendant les délais nécessaires à la défense de droits. Les pièces de facturation sont conservées selon les obligations légales. Les données supprimables sont effacées ou anonymisées lorsqu’elles ne sont plus nécessaires.</p></section>
    <section><h2>Transferts</h2><p>Certains prestataires peuvent traiter des données hors de l’Espace économique européen avec les garanties contractuelles prévues par la réglementation applicable.</p></section>
    <section><h2>Vos droits</h2><p>Vous pouvez demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos données, et vous opposer à certains traitements, en écrivant à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Vous pouvez également saisir la CNIL.</p></section>
    <section><h2>Sécurité</h2><p>Nous appliquons des mesures techniques et organisationnelles proportionnées, notamment le contrôle d’accès, la séparation des secrets, la vérification des notifications Stripe et des restrictions d’accès en base.</p></section>
    <section><h2>Prévention des contenus illicites — KarlMada</h2><p>Les textes, offres, produits, prestations, brouillons, publications et demandes adressées à l’intelligence artificielle peuvent être analysés automatiquement afin de détecter les contenus pour adultes, drogues, armes, fraudes et autres activités illicites. En cas de détection, l’opération est bloquée. Un journal de sécurité minimal peut conserver l’identifiant du compte ou du projet, la catégorie détectée, le point de contrôle et la date, sans recopier le contenu saisi.</p></section>
    <section><h2>Cookies et choix</h2><p>Les cookies strictement nécessaires assurent la connexion, la sécurité et le fonctionnement du service. Avec votre accord, des cookies optionnels peuvent mesurer l’audience, personnaliser l’expérience ou évaluer nos campagnes de notoriété. Vous pouvez refuser ces cookies ou choisir chaque catégorie depuis la bannière. Votre choix peut être modifié à tout moment en supprimant les préférences du site dans votre navigateur.</p></section>
  </LegalPage>;
}
