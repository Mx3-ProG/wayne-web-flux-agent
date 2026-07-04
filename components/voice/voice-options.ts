import type { VoiceProfile } from "@/lib/types";

export type VoiceDraft = Omit<VoiceProfile, "user_id" | "page_id" | "updated_at">;

export const EMPTY_VOICE: VoiceDraft = {
  tone: "",
  address_form: "",
  emojis: "",
  specialty: "",
  often_told: "",
  story: "",
  vals: "",
};

export const VOICE_STEPS = [
  {
    key: "tone",
    kicker: "Ta personnalité",
    title: "Quelle énergie doit-on sentir dans tes mots ?",
    subtitle: "Choisis la manière dont Flux s’adressera à tes clients.",
    options: [
      { value: "Complice et chaleureux", title: "Complice & chaleureux", text: "Proche, humain, comme avec un client fidèle." },
      { value: "Pro et expert", title: "Pro & expert", text: "Clair, rassurant et toujours crédible." },
      { value: "Doux et posé", title: "Doux & posé", text: "Calme, attentif et sans pression." },
      { value: "Solaire et pétillant", title: "Solaire & pétillant", text: "Positif, vivant et plein d’élan." },
      { value: "Chic et raffiné", title: "Chic & raffiné", text: "Élégant, précis et haut de gamme." },
      { value: "Direct et sans détour", title: "Direct & efficace", text: "Peu de blabla, une promesse nette." },
    ],
  },
  {
    key: "address_form",
    kicker: "Ta relation client",
    title: "Tu tutoies ou tu vouvoies ?",
    subtitle: "Flux gardera cette règle dans tous tes contenus.",
    options: [
      { value: "tu", title: "Je tutoie", text: "Une relation directe, simple et familière." },
      { value: "vous", title: "Je vouvoie", text: "Une relation professionnelle et respectueuse." },
    ],
  },
  {
    key: "emojis",
    kicker: "Ton style",
    title: "Quelle place pour les emojis ?",
    subtitle: "Juste assez pour te ressembler, jamais pour faire artificiel.",
    options: [
      { value: "beaucoup", title: "J’en utilise souvent", text: "Ils font partie de ma façon de communiquer." },
      { value: "parfois", title: "Avec modération", text: "Un emoji seulement lorsqu’il apporte quelque chose." },
      { value: "jamais", title: "Aucun emoji", text: "Je préfère une communication sobre et nette." },
    ],
  },
  {
    key: "specialty",
    kicker: "Ta signature",
    title: "Pourquoi vient-on chez toi ?",
    subtitle: "Choisis la force que tes clients doivent retenir en premier.",
    options: [
      { value: "Le rendu naturel, on ne voit que le résultat", title: "Le résultat naturel", text: "Un travail juste, sans effet forcé." },
      { value: "La précision, le travail propre", title: "La précision", text: "Chaque détail compte jusqu’à la finition." },
      { value: "La qualité qui dure", title: "La qualité durable", text: "Un résultat pensé pour tenir dans le temps." },
      { value: "Le sur-mesure, jamais deux fois pareil", title: "Le sur-mesure", text: "Chaque client reçoit une réponse vraiment personnelle." },
      { value: "Le rapport qualité-prix imbattable", title: "Le juste prix", text: "Une vraie valeur, claire et sans mauvaise surprise." },
      { value: "La rapidité sans bâcler", title: "La réactivité", text: "Aller vite tout en restant irréprochable." },
    ],
  },
  {
    key: "often_told",
    kicker: "La preuve",
    title: "Que disent souvent tes clients ?",
    subtitle: "Choisis la phrase qui revient le plus après une expérience avec toi.",
    options: [
      { value: "On sent que tu prends vraiment le temps.", title: "« Tu prends le temps »", text: "Tes clients se sentent écoutés et considérés." },
      { value: "C’est toujours impeccable.", title: "« C’est impeccable »", text: "La régularité de ton travail rassure immédiatement." },
      { value: "On se sent tout de suite à l’aise.", title: "« On se sent à l’aise »", text: "Ton accueil transforme l’expérience." },
      { value: "Tu trouves toujours une solution.", title: "« Tu trouves une solution »", text: "Tu rassures même quand la demande est compliquée." },
      { value: "Le résultat dépasse mes attentes.", title: "« Encore mieux que prévu »", text: "L’effet final crée une vraie émotion." },
      { value: "On peut vraiment compter sur toi.", title: "« On peut compter sur toi »", text: "Ta fiabilité fait revenir tes clients." },
    ],
  },
  {
    key: "story",
    kicker: "Ton histoire",
    title: "Qu’est-ce qui t’a mené à ce métier ?",
    subtitle: "Flux transformera cette origine en histoire humaine et crédible.",
    options: [
      { value: "Une passion devenue métier au fil du temps.", title: "Une passion devenue métier", text: "Tu as choisi de vivre pleinement ce qui t’animait." },
      { value: "Une reconversion choisie pour exercer un métier qui a du sens.", title: "Une reconversion choisie", text: "Tu as changé de voie pour te rapprocher de l’essentiel." },
      { value: "Un savoir-faire transmis et perfectionné avec les années.", title: "Un savoir-faire transmis", text: "Ton métier s’inscrit dans une histoire plus grande." },
      { value: "Une aventure familiale construite autour d’un savoir-faire commun.", title: "Une aventure familiale", text: "Le lien et la transmission font partie de ton identité." },
      { value: "L’envie de proposer une meilleure façon de faire dans mon secteur.", title: "L’envie de faire mieux", text: "Tu as créé l’expérience que tu ne trouvais pas ailleurs." },
      { value: "Le désir d’entreprendre localement et d’être utile autour de moi.", title: "Entreprendre localement", text: "Ton commerce est profondément lié à son territoire." },
    ],
  },
  {
    key: "vals",
    kicker: "Tes valeurs",
    title: "Qu’est-ce qui compte vraiment pour toi ?",
    subtitle: "Choisis jusqu’à trois valeurs. Elles guideront chaque contenu.",
    multiple: true,
    options: [
      { value: "La qualité", title: "La qualité", text: "Ne jamais livrer quelque chose que tu n’assumes pas." },
      { value: "L’écoute", title: "L’écoute", text: "Comprendre avant de proposer." },
      { value: "La confiance", title: "La confiance", text: "Construire une relation qui dure." },
      { value: "L’authenticité", title: "L’authenticité", text: "Rester vrai, même dans la communication." },
      { value: "La ponctualité", title: "La fiabilité", text: "Tenir parole, respecter le temps des autres." },
      { value: "La proximité", title: "La proximité", text: "Faire vivre une relation humaine et locale." },
    ],
  },
] as const;

