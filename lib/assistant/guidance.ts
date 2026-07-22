import type { AssistantSurface } from "./types";

export type FluxGuidancePlacement = "brand-hero" | "step" | "context" | "compact";
export type FluxGuidanceTrigger = "always" | "first-visit" | "error" | "success" | "journey";

export type FluxGuidanceMessage = {
  id: string;
  surface: AssistantSurface;
  placement: FluxGuidancePlacement;
  trigger: FluxGuidanceTrigger;
  eyebrow: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
};

const messages = {
  "marketing-home": {
    surface: "marketing", placement: "brand-hero", trigger: "always",
    eyebrow: "Ton guide FLUX", title: "Je t’accompagne, une étape après l’autre.",
    body: "Tu n’as rien de technique à apprendre. Dis-moi ce que tu veux obtenir et je te montre le bon chemin.",
    action: { label: "Commencer avec FLUX", href: "/commencer" },
  },
  "marketing-pricing": {
    surface: "marketing", placement: "context", trigger: "always",
    eyebrow: "FLUX t’aide à choisir", title: "Pas besoin de comprendre tous les détails.",
    body: "Choisis simplement la situation qui te ressemble : je te montrerai la formule la plus adaptée.",
  },
  "marketing-login": {
    surface: "marketing", placement: "compact", trigger: "always",
    eyebrow: "FLUX te rassure", title: "Tout est resté à sa place.",
    body: "Connecte-toi et tu reprendras ton parcours exactement là où tu l’avais laissé.",
  },
  "marketing-login-error": {
    surface: "marketing", placement: "compact", trigger: "error",
    eyebrow: "On reprend calmement", title: "La connexion n’a pas fonctionné.",
    body: "Vérifie ton adresse et ton mot de passe. Rien n’a été perdu et tu peux réessayer.",
  },
  "marketing-invitation": {
    surface: "marketing", placement: "compact", trigger: "always",
    eyebrow: "Bienvenue, je suis FLUX", title: "Je vais te guider sans jargon.",
    body: "La création prend quelques minutes et chaque choix est enregistré au fur et à mesure.",
  },
  "onboarding-account": {
    surface: "onboarding", placement: "step", trigger: "always",
    eyebrow: "Avant de commencer", title: "Créons d’abord ton accès.",
    body: "Ces informations servent uniquement à sauvegarder ton avancée et à te permettre de revenir plus tard.",
  },
  "onboarding-account-error": {
    surface: "onboarding", placement: "step", trigger: "error",
    eyebrow: "Je suis là", title: "Ton compte n’a pas encore été créé.",
    body: "Relis les champs indiqués puis réessaie. Tes réponses resteront intactes.",
  },
  "onboarding-step-error": {
    surface: "onboarding", placement: "step", trigger: "error",
    eyebrow: "On reprend calmement", title: "Cette étape n’a pas encore été enregistrée.",
    body: "Rien n’a été publié. Vérifie les informations de cet écran puis utilise à nouveau le bouton Continuer.",
  },
  "onboarding-1": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Chapitre 1", title: "On commence par ton identité.", body: "Je vais transformer ce que tu sais déjà sur ton métier en une présence claire sur internet." },
  "onboarding-2": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Ton activité", title: "Choisis simplement la famille la plus proche.", body: "Ce choix adapte les mots, les outils et les étapes à ton métier. Tu pourras toujours préciser ensuite." },
  "onboarding-3": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Ton objectif", title: "Dis-moi ce qui compte le plus maintenant.", body: "Je m’en servirai pour te proposer les actions les plus utiles en premier." },
  "onboarding-4": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Ton identité", title: "Écris comme tu parlerais à un client.", body: "Le nom, le métier et la ville suffisent pour créer la première version de ta vitrine." },
  "onboarding-5": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Ta voix", title: "Choisis le ton qui te ressemble.", body: "FLUX utilisera cette manière de parler pour éviter les textes froids ou trop techniques." },
  "onboarding-6": { surface: "onboarding", placement: "step", trigger: "success", eyebrow: "Première victoire", title: "Ton adresse existe maintenant.", body: "Ton identité est sauvegardée. La suite consiste à montrer clairement ce que tu proposes." },
  "onboarding-7": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Chapitre 2", title: "Remplissons maintenant ta vitrine.", body: "Un visiteur doit comprendre en quelques secondes ce qu’il peut acheter ou réserver." },
  "onboarding-8": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Ton catalogue", title: "Commence par un seul produit ou service.", body: "Tu pourras en ajouter d’autres plus tard. Ici, nous créons simplement un premier exemple concret." },
  "onboarding-9": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Ton offre", title: "Mets en avant une raison de te choisir.", body: "Une offre claire aide le visiteur à décider sans devoir t’appeler pour tout comprendre." },
  "onboarding-10": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Tes horaires", title: "Indique quand tes clients peuvent venir.", body: "Les jours et horaires choisis alimenteront automatiquement les créneaux de réservation." },
  "onboarding-11": { surface: "onboarding", placement: "step", trigger: "success", eyebrow: "Deuxième victoire", title: "Tes clients savent quoi choisir.", body: "Ton offre est prête. Il reste à donner une apparence personnelle à ta vitrine et à la partager." },
  "onboarding-12": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Chapitre 3", title: "Rendons ton commerce visible.", body: "Nous allons préparer ton image, publier ta vitrine puis t’aider à la faire circuler." },
  "onboarding-13": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Ton premier contenu", title: "Une publication suffit pour commencer.", body: "Choisis un outil et vérifie toujours le coût affiché avant de lancer une création." },
  "onboarding-14": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Tes résultats", title: "Voici les chiffres utiles, sans jargon.", body: "Tu retrouveras ici tes crédits, tes créations et les demandes reçues depuis ta vitrine." },
  "onboarding-15": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Ton ambiance", title: "Choisis l’univers qui ressemble à ton commerce.", body: "La structure restera lisible sur téléphone. Tu choisis seulement l’atmosphère générale." },
  "onboarding-16": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Tes images", title: "Une photo vraie vaut mieux qu’une photo parfaite.", body: "Ajoute ton logo ou ton portrait et une image qui montre immédiatement ton activité." },
  "onboarding-17": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Les derniers détails", title: "Vérifie comment on peut te joindre.", body: "Ces informations permettront à un visiteur de t’appeler ou de venir sans chercher ailleurs." },
  "onboarding-18": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Mise en ligne", title: "Publier rend la version visible aux clients.", body: "Relis l’aperçu. Rien n’est envoyé ou publié sans ton action sur le bouton de confirmation." },
  "onboarding-19": { surface: "onboarding", placement: "step", trigger: "always", eyebrow: "Le partage", title: "Ton lien peut maintenant circuler.", body: "Copie-le dans WhatsApp, Instagram ou ta fiche Google pour conduire les clients vers ta vitrine." },
  "onboarding-20": { surface: "onboarding", placement: "step", trigger: "success", eyebrow: "Parcours terminé", title: "Tu peux maintenant avancer à ton rythme.", body: "Ton espace est prêt. Je resterai disponible sur chaque page si tu ne sais plus où aller." },
  "app-editor": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Modifier, prévisualiser, puis publier.", body: "Tes changements restent dans un brouillon. L’aperçu montre le résultat et le bouton Publier le rend visible.", action: { label: "Ouvrir l’éditeur complet", href: "/ma-page?view=editor" } },
  "app-products": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Ici vivent les produits de ta boutique.", body: "Commence par une catégorie, puis ajoute les produits avec leur prix et éventuellement leur stock.", action: { label: "Ajouter un produit", href: "/produits/configurer" } },
  "app-offers": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Une offre aide le client à décider.", body: "Crée une proposition simple avec un bénéfice, un prix et une action claire.", action: { label: "Créer une offre", href: "/offres/configurer" } },
  "app-agenda": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Tes disponibilités deviennent des réservations.", body: "Configure d’abord tes horaires. Tu pourras ensuite consulter et organiser les rendez-vous reçus.", action: { label: "Voir mon agenda", href: "/agenda?view=agenda" } },
  "app-orders": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Toutes les demandes arrivent ici.", body: "Ouvre une commande pour vérifier son contenu puis fais évoluer son statut au fur et à mesure.", action: { label: "Voir ma vitrine", href: "/ma-page" } },
  "app-statistics": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Regarde seulement les chiffres qui t’aident à agir.", body: "Les visites montrent l’intérêt. Les clics et demandes montrent ce qui transforme cet intérêt en client.", action: { label: "Ouvrir les statistiques", href: "/statistiques?view=stats" } },
  "app-content": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Ton coffre conserve toutes tes créations.", body: "Retrouve ici les contenus générés pour ton projet actif et réutilise-les quand tu en as besoin.", action: { label: "Créer un nouveau contenu", href: "/espace#outils" } },
  "app-voice": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Apprends-moi à parler comme toi.", body: "Plus ta voix est précise, plus les textes produits ressemblent réellement à ton commerce.", action: { label: "Configurer ma voix", href: "/contexte/configurer" } },
  "app-projects": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Un projet correspond à une activité ou une vitrine.", body: "Sélectionne le projet actif avant de modifier ses produits, ses offres ou ses contenus.", action: { label: "Créer un projet", href: "/projets/nouveau" } },
  "app-credits": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Les crédits servent uniquement aux créations assistées.", body: "Naviguer, modifier ta vitrine et utiliser ce guide ne consomment aucun crédit.", action: { label: "Voir les formules", href: "/formules" } },
  "app-install": { surface: "app", placement: "context", trigger: "first-visit", eyebrow: "FLUX t’explique", title: "Installe FLUX comme une application.", body: "Tu retrouveras ton espace depuis l’écran d’accueil, sans devoir chercher l’adresse dans ton navigateur.", action: { label: "Voir les instructions", href: "/installer" } },
  "journey-1": { surface: "app", placement: "context", trigger: "journey", eyebrow: "FLUX te recommande maintenant", title: "Crée ta vitrine.", body: "C’est la base : une adresse claire que tu pourras partager partout.", action: { label: "Créer ma vitrine", href: "/ma-page" } },
  "journey-2": { surface: "app", placement: "context", trigger: "journey", eyebrow: "FLUX te recommande maintenant", title: "Apprends-moi à parler comme toi.", body: "Quelques réponses suffisent pour obtenir des textes plus naturels et plus personnels.", action: { label: "Configurer ma voix", href: "/contexte/configurer" } },
  "journey-3": { surface: "app", placement: "context", trigger: "journey", eyebrow: "FLUX te recommande maintenant", title: "Ajoute ton premier produit.", body: "Un exemple concret aide immédiatement les visiteurs à comprendre ce que tu proposes.", action: { label: "Ajouter un produit", href: "/produits/configurer" } },
  "journey-4": { surface: "app", placement: "context", trigger: "journey", eyebrow: "FLUX te recommande maintenant", title: "Crée une offre claire.", body: "Donne à tes visiteurs une bonne raison de passer à l’action maintenant.", action: { label: "Créer une offre", href: "/offres/configurer" } },
  "journey-5": { surface: "app", placement: "context", trigger: "journey", eyebrow: "FLUX te recommande maintenant", title: "Ouvre tes premiers créneaux.", body: "Tes clients pourront réserver même lorsque tu n’es pas disponible pour répondre.", action: { label: "Configurer mes horaires", href: "/agenda" } },
  "journey-6": { surface: "app", placement: "context", trigger: "journey", eyebrow: "FLUX te recommande maintenant", title: "Crée ton premier contenu.", body: "Choisis un outil et prépare une publication qui ramène les visiteurs vers ta vitrine.", action: { label: "Choisir un outil", href: "/espace#outils" } },
  "journey-7": { surface: "app", placement: "context", trigger: "journey", eyebrow: "FLUX te recommande maintenant", title: "Regarde ce qui fonctionne.", body: "Les premiers chiffres te montrent où les visiteurs arrivent et ce qu’ils choisissent.", action: { label: "Voir mes statistiques", href: "/statistiques" } },
  "journey-8": { surface: "app", placement: "context", trigger: "journey", eyebrow: "FLUX te recommande maintenant", title: "Partage ton lien.", body: "Ta vitrine commence à travailler quand son adresse circule auprès de tes clients.", action: { label: "Retrouver mon lien", href: "/espace#etape-8" } },
} as const satisfies Record<string, Omit<FluxGuidanceMessage, "id">>;

export type FluxGuidanceId = keyof typeof messages;

export function getFluxGuidance(id: FluxGuidanceId): FluxGuidanceMessage {
  return { id, ...messages[id] };
}

export const TUNNEL_GUIDANCE_BY_SCREEN = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => [index + 1, `onboarding-${index + 1}`]),
) as Record<number, FluxGuidanceId>;

export const JOURNEY_GUIDANCE_BY_STEP = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => [index + 1, `journey-${index + 1}`]),
) as Record<number, FluxGuidanceId>;

export const APP_ROUTE_GUIDANCE: { prefix: string; messageId: FluxGuidanceId }[] = [
  { prefix: "/ma-page", messageId: "app-editor" },
  { prefix: "/produits", messageId: "app-products" },
  { prefix: "/offres", messageId: "app-offers" },
  { prefix: "/agenda", messageId: "app-agenda" },
  { prefix: "/commandes", messageId: "app-orders" },
  { prefix: "/statistiques", messageId: "app-statistics" },
  { prefix: "/resultats", messageId: "app-content" },
  { prefix: "/contexte", messageId: "app-voice" },
  { prefix: "/projets", messageId: "app-projects" },
  { prefix: "/credits", messageId: "app-credits" },
  { prefix: "/installer", messageId: "app-install" },
];

export const PLAN_GUIDANCE_CHOICES = [
  { id: "basique", label: "Je démarre simplement", detail: "Une vitrine et les outils essentiels", plan: "basique" },
  { id: "pro", label: "Je veux personnaliser davantage", detail: "Une image plus travaillée et plus de capacité", plan: "pro" },
  { id: "business", label: "Je veux mon propre domaine", detail: "Une présence plus avancée pour développer l’activité", plan: "business" },
  { id: "entreprise", label: "Je gère plusieurs vitrines", detail: "Jusqu’à dix projets dans le même compte", plan: "entreprise" },
] as const;
