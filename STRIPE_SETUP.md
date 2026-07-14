# Mise en production Stripe

Le code est prêt pour Stripe Checkout hébergé. Cette checklist relie les objets
du Dashboard à l'application sans modifier les montants côté navigateur.

## 1. Catalogue

Créer quatre produits/prix récurrents mensuels en EUR :

| Formule | Prix | Crédits par facture payée | Variable |
| --- | ---: | ---: | --- |
| Basique FLUX | 9 € / mois | 20 | `STRIPE_PRICE_BASIQUE` |
| Pro | 29 € / mois | 100 | `STRIPE_PRICE_PRO` |
| Business | 69 € / mois | 300 | `STRIPE_PRICE_BUSINESS` |
| Entreprise | 89 € / mois | 500 | `STRIPE_PRICE_ENTREPRISE` |

Les packs ponctuels restent définis dans `lib/credit-packs.ts` : 50 crédits à
20 €, 150 à 54 €, 400 à 120 €. Ils utilisent des montants serveur inline.

## 2. Checkout et portail client

Dans les paramètres Stripe de chaque environnement (sandbox puis production) :

- définir l'URL des conditions : `https://www.flux-wayne.com/cgv` ;
- définir la confidentialité : `https://www.flux-wayne.com/confidentialite` ;
- compléter le nom public, l'adresse, le support, le logo et la couleur ;
- activer le Customer Portal ;
- autoriser la mise à jour du moyen de paiement et l'historique des factures ;
- autoriser l'annulation en fin de période ;
- configurer les changements de formule et leur prorata ;
- activer les e-mails de reçu, facture payée, échec de paiement et fin d'essai ;
- configurer Smart Retries et le passage final à `unpaid` ou `canceled`.

Si Stripe Tax est configuré avec les immatriculations fiscales correctes,
passer `STRIPE_AUTOMATIC_TAX=true`. Sinon, conserver `false` et configurer le
régime de taxe des Prices/factures avec le conseil du comptable de l'entreprise.

Les moyens de paiement se configurent dans Stripe. Le code ne force pas la
carte et laisse Checkout proposer uniquement ceux compatibles avec le mode.

## 3. Webhook

Créer un endpoint vers :

`https://www.flux-wayne.com/api/stripe/webhook`

Événements à sélectionner :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`. Le secret sandbox
et le secret production sont différents.

## 4. Base et environnement

Appliquer `supabase/migrations/00020_stripe_billing.sql`, puis renseigner toutes
les variables Stripe et d'identité légale listées dans `.env.example`.

Les pages légales ne doivent pas être publiées avec `À renseigner` ou
`Adresse communiquée sur demande` : remplacer ces valeurs par les informations
exactes de l'entreprise avant le déploiement public.

## 5. Recette sandbox

Vérifier au minimum : achat de chaque pack, souscription à chaque formule,
authentification 3DS, abandon Checkout, double clic, rejeu d'un webhook,
renouvellement via une Test Clock, paiement échoué, régularisation, changement
de formule, annulation en fin de période et téléchargement d'une facture.

Contrôles attendus : une facture ne recharge qu'une fois, un achat de pack ne
crédite qu'une fois, une URL de confirmation d'un autre utilisateur est refusée,
et un abonnement `unpaid` ou `canceled` ne donne plus accès aux actions payantes.
