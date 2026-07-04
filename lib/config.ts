// Flags de fonctionnalités selon l'environnement.

// Nom de domaine personnalisé : fonctionnel en local (dev) pour préparer la
// fonctionnalité, mais coupé en production tant qu'elle n'est pas prête
// (routing DNS, vérification, etc. — « à venir »). Le middleware ne route un
// host custom que si ce flag est vrai.
export const CUSTOM_DOMAIN_ENABLED = process.env.NODE_ENV === "development";
