import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return <LegalPage title="Politique de confidentialité">
    <section><h2>Responsable du traitement</h2><p>{COMPANY.legalName} traite les données nécessaires au fonctionnement de Wayne Web Flux. Contact : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p></section>
    <section><h2>Données traitées</h2><p>Nous pouvons traiter les données de compte et de profil professionnel, les contenus saisis, l’historique d’utilisation et de crédits, les données techniques de sécurité, ainsi que les références de facturation. Les données complètes de carte bancaire sont collectées et conservées par Stripe, pas par Wayne Web Flux.</p></section>
    <section><h2>Finalités et bases</h2><ul><li>Créer et sécuriser le compte, exécuter le contrat et fournir les fonctionnalités.</li><li>Traiter les paiements, factures, abonnements et demandes d’assistance.</li><li>Prévenir les abus et améliorer la fiabilité sur la base de notre intérêt légitime.</li><li>Respecter les obligations comptables, fiscales et légales.</li></ul></section>
    <section><h2>Destinataires</h2><p>Les données sont accessibles aux personnes habilitées et aux prestataires nécessaires au service, notamment Supabase pour les données applicatives, Stripe pour les paiements, Vercel pour l’hébergement et les fournisseurs d’intelligence artificielle lorsque l’utilisateur lance une génération.</p></section>
    <section><h2>Durées</h2><p>Les données du compte sont conservées pendant la relation contractuelle puis pendant les délais nécessaires à la défense de droits. Les pièces de facturation sont conservées selon les obligations légales. Les données supprimables sont effacées ou anonymisées lorsqu’elles ne sont plus nécessaires.</p></section>
    <section><h2>Transferts</h2><p>Certains prestataires peuvent traiter des données hors de l’Espace économique européen avec les garanties contractuelles prévues par la réglementation applicable.</p></section>
    <section><h2>Vos droits</h2><p>Vous pouvez demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos données, et vous opposer à certains traitements, en écrivant à <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Vous pouvez également saisir la CNIL.</p></section>
    <section><h2>Sécurité</h2><p>Nous appliquons des mesures techniques et organisationnelles proportionnées, notamment le contrôle d’accès, la séparation des secrets, la vérification des notifications Stripe et des restrictions d’accès en base.</p></section>
  </LegalPage>;
}
