# Registre de conception des vitrines

Ce dossier est la source de vérité des designs que l’éditeur et FLUX ont le
droit d’appliquer aux vitrines.

## Ajouter un design

1. Ajouter la primitive dans `components/catalog.ts` avec un identifiant stable.
2. Implémenter son `renderId` via un attribut `data-design-*` dans le socle vitrine.
3. Référencer la primitive dans un kit si elle doit devenir un défaut cohérent.
4. Ajouter son identifiant au schéma FLUX et vérifier l’aperçu mobile/desktop.

Les kits définissent les défauts. `Page.design.components` ne contient que les
exceptions choisies par le commerçant ou FLUX. Une page sans `design` retombe
toujours sur le kit correspondant à son ancien champ `theme`.

Les voix de `voices/` sont rédigées en interne. Ne jamais y copier un profil,
un texte ou une donnée permettant d’identifier un utilisateur.

Le slot `checkout` prépare le futur paiement marchand. Il ne contrôle jamais
le checkout des abonnements et crédits de la plateforme FLUX.
