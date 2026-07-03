// Textes légaux par défaut de la vitrine, générés avec des [À COMPLÉTER]
// que le commerçant remplace quand il a 2 minutes. Rien ne bloque sans.

export function defaultLegal(businessName: string) {
  const name = businessName || "[À COMPLÉTER : Prénom NOM]";
  return {
    mentions: `MENTIONS LÉGALES

Éditeur du site :
${name}
Statut : [À COMPLÉTER : micro-entreprise / EI / société]
SIRET : [À COMPLÉTER]
Adresse : [À COMPLÉTER]
E-mail : [À COMPLÉTER]
Téléphone : [À COMPLÉTER]

Hébergement :
Ce site est hébergé par l'hébergeur choisi par l'éditeur.

Propriété intellectuelle :
L'ensemble des contenus de ce site (textes, images) est la propriété de l'éditeur, sauf mention contraire. Toute reproduction sans autorisation est interdite.`,
    cgv: `CONDITIONS GÉNÉRALES DE VENTE

1. Prestations
Les prestations proposées sont réalisées sur rendez-vous. Les tarifs affichés sont en euros, TTC.

2. Réservation
Toute réservation vaut acceptation des présentes conditions. Un rendez-vous est confirmé après validation du créneau.

3. Annulation / Retard
Toute annulation doit être signalée au moins [À COMPLÉTER : 24h] à l'avance. En cas de retard, la prestation pourra être écourtée ou reportée.

4. Paiement
Le paiement s'effectue [À COMPLÉTER : sur place, en espèces / carte] à l'issue de la prestation.

5. Responsabilité
Le client s'engage à signaler toute information utile (allergie, contre-indication, contrainte technique) avant la prestation.

Éditeur : ${name} — SIRET : [À COMPLÉTER]`,
    confidentialite: `POLITIQUE DE CONFIDENTIALITÉ

Responsable du traitement :
${name} — [À COMPLÉTER : e-mail]

Données collectées :
Lors d'une réservation, sont collectés : prénom, téléphone et/ou e-mail. Ces données servent uniquement à gérer le rendez-vous.

Conservation :
Les données sont conservées le temps nécessaire à la gestion des rendez-vous, puis supprimées.

Vos droits (RGPD) :
Vous pouvez à tout moment demander l'accès, la modification ou la suppression de vos données en écrivant à : [À COMPLÉTER : e-mail].

Aucune donnée n'est revendue à des tiers.`,
  };
}
