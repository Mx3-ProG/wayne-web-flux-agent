// Fondations de la couche d'intégration (Phase 0). Voir INTEGRATIONS_PLAN.md
// pour l'architecture complète. Un connecteur ne déclare que les méthodes
// correspondant à ses capabilities — pas d'implémentation factice du reste.

export type Capability =
  | "READ_CUSTOMERS"
  | "WRITE_CUSTOMERS"
  | "READ_APPOINTMENTS"
  | "WRITE_APPOINTMENTS"
  | "READ_SERVICES"
  | "READ_PRODUCTS"
  | "WRITE_PRODUCTS"
  | "READ_TRANSACTIONS"
  | "WEBHOOKS";

export type ExternalEntityType = "customer" | "appointment" | "product" | "service" | "employee";
export type FluxEntityType = "customer" | "booking" | "product" | "service";

// Enregistrement brut tel que renvoyé par un fournisseur, avant normalisation.
export type RawRecord = {
  externalId: string;
  updatedAt?: string;
  data: Record<string, unknown>;
};

// Modèle canonique FLUX — volontairement calqué sur les tables existantes
// (customers, bookings, services, products) plutôt que sur une spec abstraite.
export type CanonicalCustomer = {
  pageId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  birthday?: string;
  notes?: string;
  tags?: string[];
  source: string;
};

export type CanonicalAppointment = {
  pageId: string;
  customerId?: string;
  serviceId?: string;
  serviceName: string;
  // "YYYY-MM-DDTHH:MM:SS", sans offset — horaire local de la boutique (voir
  // lib/integrations/naive-time.ts), jamais un ISO UTC.
  startAt: string;
  durationMin: number;
  priceCents: number;
  status: "confirmed" | "cancelled";
  source: string;
};

export type CanonicalService = {
  pageId: string;
  name: string;
  durationMin: number;
  priceCents: number;
  source: string;
};

export type CanonicalProduct = {
  pageId: string;
  name: string;
  priceCents: number;
  source: string;
};

export type CanonicalEntity =
  | { type: "customer"; entity: CanonicalCustomer }
  | { type: "appointment"; entity: CanonicalAppointment }
  | { type: "service"; entity: CanonicalService }
  | { type: "product"; entity: CanonicalProduct };

export type CanonicalEvent = {
  type: string; // ex: 'customer.created', 'appointment.cancelled'
  entity: CanonicalEntity;
};

export type ConnectorAuthResult = {
  authType: "oauth2" | "api_key" | "basic";
  secretPayload: Record<string, unknown>; // chiffré par lib/integrations/crypto avant écriture
  expiresAt?: string;
  accountLabel?: string;
};

export type OAuthCallbackInput = { kind: "oauth2"; code: string; redirectUri: string };
export type ApiKeyInput = { kind: "api_key" | "basic"; credentials: Record<string, string> };

export type ConnectorLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export type ConnectorContext = {
  pageId: string;
  integrationId: string;
  getSecret(): Promise<Record<string, unknown> | null>;
  logger: ConnectorLogger;
};

export interface Connector {
  readonly provider: string;
  readonly capabilities: readonly Capability[];

  // Uniquement pour les providers OAuth2 : construit l'URL de consentement.
  // L'échange du code retourné passe toujours par authenticate() ci-dessous.
  buildAuthorizationUrl?(state: string): string;

  authenticate(ctx: ConnectorContext, input: OAuthCallbackInput | ApiKeyInput): Promise<ConnectorAuthResult>;
  refreshAuthentication?(ctx: ConnectorContext): Promise<ConnectorAuthResult>;
  disconnect(ctx: ConnectorContext): Promise<void>;

  fetchCustomers?(ctx: ConnectorContext, since?: string): AsyncGenerator<RawRecord>;
  fetchAppointments?(ctx: ConnectorContext, since?: string): AsyncGenerator<RawRecord>;
  fetchServices?(ctx: ConnectorContext): AsyncGenerator<RawRecord>;
  fetchProducts?(ctx: ConnectorContext): AsyncGenerator<RawRecord>;

  pushCustomer?(ctx: ConnectorContext, customer: CanonicalCustomer): Promise<{ externalId: string }>;
  pushAppointment?(ctx: ConnectorContext, appt: CanonicalAppointment): Promise<{ externalId: string }>;
  updateAppointment?(
    ctx: ConnectorContext,
    externalId: string,
    patch: Partial<CanonicalAppointment>
  ): Promise<void>;

  handleWebhook?(ctx: ConnectorContext, event: RawRecord): Promise<CanonicalEvent[]>;

  // Pur : pas d'I/O, pas d'IA. Une même entrée doit toujours produire la
  // même sortie.
  mapToCanonical(entityType: ExternalEntityType, raw: RawRecord): CanonicalEntity;
}
