// Contexte d'un agent FLUX Intelligence pour un tenant donné (`page_id`),
// indépendant du canal (voix aujourd'hui, texte/automations plus tard).
// Construit dynamiquement à chaque interaction — jamais de gabarit statique
// par client (voir lib/intelligence/context/build-agent-context.ts).

export type AgentPermissions = {
  allowBooking: boolean;
  allowRescheduling: boolean;
  allowCancellation: boolean;
  allowCustomerCreation: boolean;
  allowSms: boolean;
  allowTransferToHuman: boolean;
};

export type AgentServiceInfo = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
};

export type AgentContext = {
  pageId: string;
  businessName: string;
  city: string;
  address: string;
  phone: string;
  hoursText: string;
  companyDescription: string;
  instructions: string;
  agentName: string;
  tone: string;
  voice: string;
  greeting: string;
  language: string;
  timezone: string;
  services: AgentServiceInfo[];
  permissions: AgentPermissions;
  fallbackPhoneNumber: string | null;
  // Numéro de l'appelant, quand connu (résolu par le canal, ex. Voice depuis
  // le webhook Twilio). Les tools qui en ont besoin (find_customer,
  // create_appointment) le reçoivent explicitement en argument plutôt que de
  // le lire ici, pour rester utilisables aussi depuis un canal texte.
  callerPhone: string | null;
};
