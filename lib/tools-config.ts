// Config data-driven des outils IA. Chaque outil : coût fixe en crédits,
// formulaire à selects, et gabarit de prompt. Coût toujours affiché avant génération.

export type ToolField = {
  id: string;
  label: string;
  type: "select" | "text" | "textarea";
  options?: { value: string; label: string }[];
  placeholder?: string;
  optional?: boolean;
};

export type Tool = {
  slug: string;
  name: string;
  badge?: string;
  cost: number;
  tagline: string;
  description: string;
  steps: [string, string, string];
  fields: ToolField[];
  systemHint: string; // consigne spécifique à l'outil pour le prompt
};

export const PREFILL_COST = 10;

export const TOOLS: Tool[] = [
  {
    slug: "posts",
    name: "Posts réseaux sociaux",
    badge: "Le plus utilisé",
    cost: 25,
    tagline: "Ton prochain post est déjà écrit, il n'attend que toi.",
    description:
      "Script de reel ou légende de post, prêt à publier : l'accroche, le contenu, le texte à l'écran et l'appel à l'action.",
    steps: [
      "Dis le sujet (une prestation, une astuce, un avant/après) ou laisse l'IA proposer.",
      "Tu reçois un contenu complet : accroche, déroulé, texte à l'écran, hashtags.",
      "Tu publies. Pas de page blanche, pas d'heures perdues.",
    ],
    fields: [
      {
        id: "format",
        label: "Type de contenu",
        type: "select",
        options: [
          { value: "reel", label: "Reel / vidéo courte" },
          { value: "carrousel", label: "Carrousel (photos à faire défiler)" },
          { value: "post", label: "Post simple (photo + légende)" },
        ],
      },
      {
        id: "objectif",
        label: "Il sert à quoi, ce post ?",
        type: "select",
        options: [
          { value: "visibilite", label: "Toucher un max de monde" },
          { value: "expertise", label: "Prouver mon expertise" },
          { value: "conversion", label: "Donner envie de réserver" },
        ],
      },
      {
        id: "sujet",
        label: "Le sujet (facultatif)",
        type: "text",
        placeholder: "Ex : ma prestation phare, une astuce, un avant/après…",
        optional: true,
      },
    ],
    systemHint:
      "Écris un contenu de réseau social prêt à publier. Pour un reel : hook (0-3s), valeur (3-15s), CTA, plus le texte à l'écran. Pour un carrousel : 5 à 7 slides avec titre + texte court. Pour un post : légende structurée. Termine par 5 hashtags locaux pertinents.",
  },
  {
    slug: "reponses",
    name: "Réponses clients",
    cost: 15,
    tagline: "Le « c'est combien ? » qui se transforme en rendez-vous.",
    description:
      "Des messages WhatsApp/SMS prêts à envoyer : réponse à une demande de prix, relance après un lapin, réveil d'un client qui n'est pas revenu.",
    steps: [
      "Choisis la situation : demande de prix, relance, réveil client…",
      "Tu reçois 3 variantes du message, dans ton ton à toi.",
      "Tu copies, tu envoies. Le rendez-vous se prend tout seul.",
    ],
    fields: [
      {
        id: "situation",
        label: "La situation",
        type: "select",
        options: [
          { value: "prix", label: "On me demande le prix" },
          { value: "relance", label: "Relancer après un rendez-vous manqué" },
          { value: "reveil", label: "Réveiller un client pas revenu depuis longtemps" },
          { value: "avis", label: "Demander un avis Google après une prestation" },
        ],
      },
      {
        id: "canal",
        label: "Le canal",
        type: "select",
        options: [
          { value: "whatsapp", label: "WhatsApp / SMS" },
          { value: "dm", label: "DM Instagram" },
        ],
      },
      {
        id: "contexte",
        label: "Un détail sur la situation ? (facultatif)",
        type: "text",
        placeholder: "Ex : cliente fidèle, prestation à 80 €…",
        optional: true,
      },
    ],
    systemHint:
      "Écris 3 variantes courtes d'un message direct (2 à 4 phrases max chacune), naturelles et sans jargon commercial. Chaque variante doit orienter vers la prise de rendez-vous via le lien de réservation. Numérote les variantes.",
  },
  {
    slug: "google-business",
    name: "Fiche Google Business",
    cost: 40,
    tagline: "Sois celui qu'on trouve sur Google quand on cherche dans ta ville.",
    description:
      "Description optimisée pour le référencement local, liste de catégories et de services à cocher, et 3 idées de posts Google pour rester visible.",
    steps: [
      "L'IA reprend les infos de ta vitrine : métier, ville, prestations.",
      "Tu reçois une description optimisée + les catégories et services à renseigner.",
      "Tu colles tout dans ta fiche Google. Ta ville te trouve.",
    ],
    fields: [
      {
        id: "zone",
        label: "Ta zone de chalandise",
        type: "select",
        options: [
          { value: "ville", label: "Ma ville uniquement" },
          { value: "alentours", label: "Ma ville + les alentours (15-20 km)" },
          { value: "domicile", label: "Je me déplace à domicile" },
        ],
      },
      {
        id: "atout",
        label: "Ton principal atout (facultatif)",
        type: "text",
        placeholder: "Ex : parking gratuit, ouvert le dimanche, 10 ans d'expérience…",
        optional: true,
      },
    ],
    systemHint:
      "Génère : 1) une description Google Business de 700 à 750 caractères optimisée SEO local (métier + ville + prestations, sans bourrage de mots-clés), 2) la catégorie principale et 3 catégories secondaires recommandées, 3) la liste des services à déclarer, 4) trois idées de posts Google avec leur texte.",
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export const TOOL_COSTS: Record<string, number> = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t.cost])
);
