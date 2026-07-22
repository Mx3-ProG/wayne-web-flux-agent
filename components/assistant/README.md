# Assistant FLUX

Le concierge est entièrement local et déterministe. Il ne fait aucun appel à un
modèle, ne consomme aucun crédit et ne conserve jamais le texte saisi.

## Ajouter une destination

Ajouter une entrée contrôlée dans `lib/assistant/catalog.ts`. Les seules cibles
acceptées sont les routes internes (`/…`) et les ancres (`#…`). Le moteur filtre
automatiquement par surface et renvoie au plus trois résultats.

Une vitrine publique fournit ses destinations disponibles à
`FluxAssistantHost`; elle ne peut donc pas proposer une section absente.

## Ajouter une prise de parole 2D

Tous les textes de marque et de coaching vivent dans
`lib/assistant/guidance.ts`. Une page référence seulement un `messageId` via
`FluxBrandHero`, `FluxStepCoach` ou `FluxContextCard`. Chaque message déclare sa
surface, son emplacement, son déclencheur et au plus une action interne.

Les cartes intégrées ne consomment pas le plafond des sollicitations
spontanées. Elles enregistrent uniquement l'identifiant contrôlé du message et
les événements `message_seen`, `message_dismissed`, `action_clicked` ou
`step_completed`.

## Signaler un besoin d'aide

Un composant métier peut ouvrir l'assistant avec un sujet connu :

```ts
window.dispatchEvent(new CustomEvent("flux:assistant-help-needed", {
  detail: { topicId: "agenda" },
}));
```

L'événement ne doit contenir ni HTML, ni URL, ni texte utilisateur.

## Activation

- Coupe-circuit global : `NEXT_PUBLIC_FLUX_ASSISTANT_DISABLED=true`.
- Application et marketing : actifs par défaut.
- Vitrine publique : opt-in via `pages.assistant_enabled` dans l'éditeur.
- Pause et désactivation personnelles : panneau FLUX, puis réactivation depuis
  `/compte`.

Le portrait du personnage pèse environ 11 Ko. Le marketing et l'onboarding restent entièrement
en 2D. Dans l'espace connecté, Three.js et le GLB ne sont chargés qu'après le
clic explicite sur « Voir FLUX en personnage 3D ». Le GLB optimisé pèse moins de
1 Mo ; il ne contient pas encore de squelette ni de clips d'animation.
