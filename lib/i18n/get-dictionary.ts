import "server-only";
import type { Locale } from "./config";

import frCommon from "./dictionaries/fr/common.json";
import frLanding from "./dictionaries/fr/landing.json";
import frPricing from "./dictionaries/fr/pricing.json";
import frAuth from "./dictionaries/fr/auth.json";
import frLegal from "./dictionaries/fr/legal.json";
import frTunnel from "./dictionaries/fr/tunnel.json";
import frDashboard from "./dictionaries/fr/dashboard.json";
import frEditor from "./dictionaries/fr/editor.json";
import frOffers from "./dictionaries/fr/offers.json";
import frProducts from "./dictionaries/fr/products.json";
import frAgenda from "./dictionaries/fr/agenda.json";
import frOrders from "./dictionaries/fr/orders.json";
import frAnalytics from "./dictionaries/fr/analytics.json";
import frWorkspace from "./dictionaries/fr/workspace.json";
import frAccount from "./dictionaries/fr/account.json";
import frBilling from "./dictionaries/fr/billing.json";
import frProjects from "./dictionaries/fr/projects.json";
import frTools from "./dictionaries/fr/tools.json";
import frVoice from "./dictionaries/fr/voice.json";
import frStorefront from "./dictionaries/fr/storefront.json";
import frEmails from "./dictionaries/fr/emails.json";
import frErrors from "./dictionaries/fr/errors.json";
import frVerticals from "./dictionaries/fr/verticals.json";
import frJourney from "./dictionaries/fr/journey.json";
import frPageTemplates from "./dictionaries/fr/pageTemplates.json";

export type CommonDict = typeof frCommon;
export type LandingDict = typeof frLanding;
export type PricingDict = typeof frPricing;
export type AuthDict = typeof frAuth;
export type LegalDict = typeof frLegal;
export type TunnelDict = typeof frTunnel;
export type DashboardDict = typeof frDashboard;
export type EditorDict = typeof frEditor;
export type OffersDict = typeof frOffers;
export type ProductsDict = typeof frProducts;
export type AgendaDict = typeof frAgenda;
export type OrdersDict = typeof frOrders;
export type AnalyticsDict = typeof frAnalytics;
export type WorkspaceDict = typeof frWorkspace;
export type AccountDict = typeof frAccount;
export type BillingDict = typeof frBilling;
export type ProjectsDict = typeof frProjects;
export type ToolsDict = typeof frTools;
export type VoiceDict = typeof frVoice;
export type StorefrontDict = typeof frStorefront;
export type EmailsDict = typeof frEmails;
export type ErrorsDict = typeof frErrors;
export type VerticalsDict = typeof frVerticals;
export type JourneyDict = typeof frJourney;
export type PageTemplatesDict = typeof frPageTemplates;

type Namespaces = {
  common: CommonDict;
  landing: LandingDict;
  pricing: PricingDict;
  auth: AuthDict;
  legal: LegalDict;
  tunnel: TunnelDict;
  dashboard: DashboardDict;
  editor: EditorDict;
  offers: OffersDict;
  products: ProductsDict;
  agenda: AgendaDict;
  orders: OrdersDict;
  analytics: AnalyticsDict;
  workspace: WorkspaceDict;
  account: AccountDict;
  billing: BillingDict;
  projects: ProjectsDict;
  tools: ToolsDict;
  voice: VoiceDict;
  storefront: StorefrontDict;
  emails: EmailsDict;
  errors: ErrorsDict;
  verticals: VerticalsDict;
  journey: JourneyDict;
  pageTemplates: PageTemplatesDict;
};

// Le français est la source de vérité : chaque dictionnaire des autres
// langues est typé contre lui — une clé manquante casse la compilation.
const loaders: {
  [L in Locale]: { [N in keyof Namespaces]: () => Promise<Namespaces[N]> };
} = {
  fr: {
    common: async () => frCommon,
    landing: async () => frLanding,
    pricing: async () => frPricing,
    auth: async () => frAuth,
    legal: async () => frLegal,
    tunnel: async () => frTunnel,
    dashboard: async () => frDashboard,
    editor: async () => frEditor,
    offers: async () => frOffers,
    products: async () => frProducts,
    agenda: async () => frAgenda,
    orders: async () => frOrders,
    analytics: async () => frAnalytics,
    workspace: async () => frWorkspace,
    account: async () => frAccount,
    billing: async () => frBilling,
    projects: async () => frProjects,
    tools: async () => frTools,
    voice: async () => frVoice,
    storefront: async () => frStorefront,
    emails: async () => frEmails,
    errors: async () => frErrors,
    verticals: async () => frVerticals,
    journey: async () => frJourney,
    pageTemplates: async () => frPageTemplates,
  },
  en: {
    common: () => import("./dictionaries/en/common.json").then((m) => m.default),
    landing: () => import("./dictionaries/en/landing.json").then((m) => m.default),
    pricing: () => import("./dictionaries/en/pricing.json").then((m) => m.default),
    auth: () => import("./dictionaries/en/auth.json").then((m) => m.default),
    legal: () => import("./dictionaries/en/legal.json").then((m) => m.default),
    tunnel: () => import("./dictionaries/en/tunnel.json").then((m) => m.default),
    dashboard: () => import("./dictionaries/en/dashboard.json").then((m) => m.default),
    editor: () => import("./dictionaries/en/editor.json").then((m) => m.default),
    offers: () => import("./dictionaries/en/offers.json").then((m) => m.default),
    products: () => import("./dictionaries/en/products.json").then((m) => m.default),
    agenda: () => import("./dictionaries/en/agenda.json").then((m) => m.default),
    orders: () => import("./dictionaries/en/orders.json").then((m) => m.default),
    analytics: () => import("./dictionaries/en/analytics.json").then((m) => m.default),
    workspace: () => import("./dictionaries/en/workspace.json").then((m) => m.default),
    account: () => import("./dictionaries/en/account.json").then((m) => m.default),
    billing: () => import("./dictionaries/en/billing.json").then((m) => m.default),
    projects: () => import("./dictionaries/en/projects.json").then((m) => m.default),
    tools: () => import("./dictionaries/en/tools.json").then((m) => m.default),
    voice: () => import("./dictionaries/en/voice.json").then((m) => m.default),
    storefront: () => import("./dictionaries/en/storefront.json").then((m) => m.default),
    emails: () => import("./dictionaries/en/emails.json").then((m) => m.default),
    errors: () => import("./dictionaries/en/errors.json").then((m) => m.default),
    verticals: () => import("./dictionaries/en/verticals.json").then((m) => m.default),
    journey: () => import("./dictionaries/en/journey.json").then((m) => m.default),
    pageTemplates: () => import("./dictionaries/en/pageTemplates.json").then((m) => m.default),
  },
  ru: {
    common: () => import("./dictionaries/ru/common.json").then((m) => m.default),
    landing: () => import("./dictionaries/ru/landing.json").then((m) => m.default),
    pricing: () => import("./dictionaries/ru/pricing.json").then((m) => m.default),
    auth: () => import("./dictionaries/ru/auth.json").then((m) => m.default),
    legal: () => import("./dictionaries/ru/legal.json").then((m) => m.default),
    tunnel: () => import("./dictionaries/ru/tunnel.json").then((m) => m.default),
    dashboard: () => import("./dictionaries/ru/dashboard.json").then((m) => m.default),
    editor: () => import("./dictionaries/ru/editor.json").then((m) => m.default),
    offers: () => import("./dictionaries/ru/offers.json").then((m) => m.default),
    products: () => import("./dictionaries/ru/products.json").then((m) => m.default),
    agenda: () => import("./dictionaries/ru/agenda.json").then((m) => m.default),
    orders: () => import("./dictionaries/ru/orders.json").then((m) => m.default),
    analytics: () => import("./dictionaries/ru/analytics.json").then((m) => m.default),
    workspace: () => import("./dictionaries/ru/workspace.json").then((m) => m.default),
    account: () => import("./dictionaries/ru/account.json").then((m) => m.default),
    billing: () => import("./dictionaries/ru/billing.json").then((m) => m.default),
    projects: () => import("./dictionaries/ru/projects.json").then((m) => m.default),
    tools: () => import("./dictionaries/ru/tools.json").then((m) => m.default),
    voice: () => import("./dictionaries/ru/voice.json").then((m) => m.default),
    storefront: () => import("./dictionaries/ru/storefront.json").then((m) => m.default),
    emails: () => import("./dictionaries/ru/emails.json").then((m) => m.default),
    errors: () => import("./dictionaries/ru/errors.json").then((m) => m.default),
    verticals: () => import("./dictionaries/ru/verticals.json").then((m) => m.default),
    journey: () => import("./dictionaries/ru/journey.json").then((m) => m.default),
    pageTemplates: () => import("./dictionaries/ru/pageTemplates.json").then((m) => m.default),
  },
  es: {
    common: () => import("./dictionaries/es/common.json").then((m) => m.default),
    landing: () => import("./dictionaries/es/landing.json").then((m) => m.default),
    pricing: () => import("./dictionaries/es/pricing.json").then((m) => m.default),
    auth: () => import("./dictionaries/es/auth.json").then((m) => m.default),
    legal: () => import("./dictionaries/es/legal.json").then((m) => m.default),
    tunnel: () => import("./dictionaries/es/tunnel.json").then((m) => m.default),
    dashboard: () => import("./dictionaries/es/dashboard.json").then((m) => m.default),
    editor: () => import("./dictionaries/es/editor.json").then((m) => m.default),
    offers: () => import("./dictionaries/es/offers.json").then((m) => m.default),
    products: () => import("./dictionaries/es/products.json").then((m) => m.default),
    agenda: () => import("./dictionaries/es/agenda.json").then((m) => m.default),
    orders: () => import("./dictionaries/es/orders.json").then((m) => m.default),
    analytics: () => import("./dictionaries/es/analytics.json").then((m) => m.default),
    workspace: () => import("./dictionaries/es/workspace.json").then((m) => m.default),
    account: () => import("./dictionaries/es/account.json").then((m) => m.default),
    billing: () => import("./dictionaries/es/billing.json").then((m) => m.default),
    projects: () => import("./dictionaries/es/projects.json").then((m) => m.default),
    tools: () => import("./dictionaries/es/tools.json").then((m) => m.default),
    voice: () => import("./dictionaries/es/voice.json").then((m) => m.default),
    storefront: () => import("./dictionaries/es/storefront.json").then((m) => m.default),
    emails: () => import("./dictionaries/es/emails.json").then((m) => m.default),
    errors: () => import("./dictionaries/es/errors.json").then((m) => m.default),
    verticals: () => import("./dictionaries/es/verticals.json").then((m) => m.default),
    journey: () => import("./dictionaries/es/journey.json").then((m) => m.default),
    pageTemplates: () => import("./dictionaries/es/pageTemplates.json").then((m) => m.default),
  },
  zh: {
    common: () => import("./dictionaries/zh/common.json").then((m) => m.default),
    landing: () => import("./dictionaries/zh/landing.json").then((m) => m.default),
    pricing: () => import("./dictionaries/zh/pricing.json").then((m) => m.default),
    auth: () => import("./dictionaries/zh/auth.json").then((m) => m.default),
    legal: () => import("./dictionaries/zh/legal.json").then((m) => m.default),
    tunnel: () => import("./dictionaries/zh/tunnel.json").then((m) => m.default),
    dashboard: () => import("./dictionaries/zh/dashboard.json").then((m) => m.default),
    editor: () => import("./dictionaries/zh/editor.json").then((m) => m.default),
    offers: () => import("./dictionaries/zh/offers.json").then((m) => m.default),
    products: () => import("./dictionaries/zh/products.json").then((m) => m.default),
    agenda: () => import("./dictionaries/zh/agenda.json").then((m) => m.default),
    orders: () => import("./dictionaries/zh/orders.json").then((m) => m.default),
    analytics: () => import("./dictionaries/zh/analytics.json").then((m) => m.default),
    workspace: () => import("./dictionaries/zh/workspace.json").then((m) => m.default),
    account: () => import("./dictionaries/zh/account.json").then((m) => m.default),
    billing: () => import("./dictionaries/zh/billing.json").then((m) => m.default),
    projects: () => import("./dictionaries/zh/projects.json").then((m) => m.default),
    tools: () => import("./dictionaries/zh/tools.json").then((m) => m.default),
    voice: () => import("./dictionaries/zh/voice.json").then((m) => m.default),
    storefront: () => import("./dictionaries/zh/storefront.json").then((m) => m.default),
    emails: () => import("./dictionaries/zh/emails.json").then((m) => m.default),
    errors: () => import("./dictionaries/zh/errors.json").then((m) => m.default),
    verticals: () => import("./dictionaries/zh/verticals.json").then((m) => m.default),
    journey: () => import("./dictionaries/zh/journey.json").then((m) => m.default),
    pageTemplates: () => import("./dictionaries/zh/pageTemplates.json").then((m) => m.default),
  },
  ja: {
    common: () => import("./dictionaries/ja/common.json").then((m) => m.default),
    landing: () => import("./dictionaries/ja/landing.json").then((m) => m.default),
    pricing: () => import("./dictionaries/ja/pricing.json").then((m) => m.default),
    auth: () => import("./dictionaries/ja/auth.json").then((m) => m.default),
    legal: () => import("./dictionaries/ja/legal.json").then((m) => m.default),
    tunnel: () => import("./dictionaries/ja/tunnel.json").then((m) => m.default),
    dashboard: () => import("./dictionaries/ja/dashboard.json").then((m) => m.default),
    editor: () => import("./dictionaries/ja/editor.json").then((m) => m.default),
    offers: () => import("./dictionaries/ja/offers.json").then((m) => m.default),
    products: () => import("./dictionaries/ja/products.json").then((m) => m.default),
    agenda: () => import("./dictionaries/ja/agenda.json").then((m) => m.default),
    orders: () => import("./dictionaries/ja/orders.json").then((m) => m.default),
    analytics: () => import("./dictionaries/ja/analytics.json").then((m) => m.default),
    workspace: () => import("./dictionaries/ja/workspace.json").then((m) => m.default),
    account: () => import("./dictionaries/ja/account.json").then((m) => m.default),
    billing: () => import("./dictionaries/ja/billing.json").then((m) => m.default),
    projects: () => import("./dictionaries/ja/projects.json").then((m) => m.default),
    tools: () => import("./dictionaries/ja/tools.json").then((m) => m.default),
    voice: () => import("./dictionaries/ja/voice.json").then((m) => m.default),
    storefront: () => import("./dictionaries/ja/storefront.json").then((m) => m.default),
    emails: () => import("./dictionaries/ja/emails.json").then((m) => m.default),
    errors: () => import("./dictionaries/ja/errors.json").then((m) => m.default),
    verticals: () => import("./dictionaries/ja/verticals.json").then((m) => m.default),
    journey: () => import("./dictionaries/ja/journey.json").then((m) => m.default),
    pageTemplates: () => import("./dictionaries/ja/pageTemplates.json").then((m) => m.default),
  },
  de: {
    common: () => import("./dictionaries/de/common.json").then((m) => m.default),
    landing: () => import("./dictionaries/de/landing.json").then((m) => m.default),
    pricing: () => import("./dictionaries/de/pricing.json").then((m) => m.default),
    auth: () => import("./dictionaries/de/auth.json").then((m) => m.default),
    legal: () => import("./dictionaries/de/legal.json").then((m) => m.default),
    tunnel: () => import("./dictionaries/de/tunnel.json").then((m) => m.default),
    dashboard: () => import("./dictionaries/de/dashboard.json").then((m) => m.default),
    editor: () => import("./dictionaries/de/editor.json").then((m) => m.default),
    offers: () => import("./dictionaries/de/offers.json").then((m) => m.default),
    products: () => import("./dictionaries/de/products.json").then((m) => m.default),
    agenda: () => import("./dictionaries/de/agenda.json").then((m) => m.default),
    orders: () => import("./dictionaries/de/orders.json").then((m) => m.default),
    analytics: () => import("./dictionaries/de/analytics.json").then((m) => m.default),
    workspace: () => import("./dictionaries/de/workspace.json").then((m) => m.default),
    account: () => import("./dictionaries/de/account.json").then((m) => m.default),
    billing: () => import("./dictionaries/de/billing.json").then((m) => m.default),
    projects: () => import("./dictionaries/de/projects.json").then((m) => m.default),
    tools: () => import("./dictionaries/de/tools.json").then((m) => m.default),
    voice: () => import("./dictionaries/de/voice.json").then((m) => m.default),
    storefront: () => import("./dictionaries/de/storefront.json").then((m) => m.default),
    emails: () => import("./dictionaries/de/emails.json").then((m) => m.default),
    errors: () => import("./dictionaries/de/errors.json").then((m) => m.default),
    verticals: () => import("./dictionaries/de/verticals.json").then((m) => m.default),
    journey: () => import("./dictionaries/de/journey.json").then((m) => m.default),
    pageTemplates: () => import("./dictionaries/de/pageTemplates.json").then((m) => m.default),
  },
  it: {
    common: () => import("./dictionaries/it/common.json").then((m) => m.default),
    landing: () => import("./dictionaries/it/landing.json").then((m) => m.default),
    pricing: () => import("./dictionaries/it/pricing.json").then((m) => m.default),
    auth: () => import("./dictionaries/it/auth.json").then((m) => m.default),
    legal: () => import("./dictionaries/it/legal.json").then((m) => m.default),
    tunnel: () => import("./dictionaries/it/tunnel.json").then((m) => m.default),
    dashboard: () => import("./dictionaries/it/dashboard.json").then((m) => m.default),
    editor: () => import("./dictionaries/it/editor.json").then((m) => m.default),
    offers: () => import("./dictionaries/it/offers.json").then((m) => m.default),
    products: () => import("./dictionaries/it/products.json").then((m) => m.default),
    agenda: () => import("./dictionaries/it/agenda.json").then((m) => m.default),
    orders: () => import("./dictionaries/it/orders.json").then((m) => m.default),
    analytics: () => import("./dictionaries/it/analytics.json").then((m) => m.default),
    workspace: () => import("./dictionaries/it/workspace.json").then((m) => m.default),
    account: () => import("./dictionaries/it/account.json").then((m) => m.default),
    billing: () => import("./dictionaries/it/billing.json").then((m) => m.default),
    projects: () => import("./dictionaries/it/projects.json").then((m) => m.default),
    tools: () => import("./dictionaries/it/tools.json").then((m) => m.default),
    voice: () => import("./dictionaries/it/voice.json").then((m) => m.default),
    storefront: () => import("./dictionaries/it/storefront.json").then((m) => m.default),
    emails: () => import("./dictionaries/it/emails.json").then((m) => m.default),
    errors: () => import("./dictionaries/it/errors.json").then((m) => m.default),
    verticals: () => import("./dictionaries/it/verticals.json").then((m) => m.default),
    journey: () => import("./dictionaries/it/journey.json").then((m) => m.default),
    pageTemplates: () => import("./dictionaries/it/pageTemplates.json").then((m) => m.default),
  },
  ar: {
    common: () => import("./dictionaries/ar/common.json").then((m) => m.default),
    landing: () => import("./dictionaries/ar/landing.json").then((m) => m.default),
    pricing: () => import("./dictionaries/ar/pricing.json").then((m) => m.default),
    auth: () => import("./dictionaries/ar/auth.json").then((m) => m.default),
    legal: () => import("./dictionaries/ar/legal.json").then((m) => m.default),
    tunnel: () => import("./dictionaries/ar/tunnel.json").then((m) => m.default),
    dashboard: () => import("./dictionaries/ar/dashboard.json").then((m) => m.default),
    editor: () => import("./dictionaries/ar/editor.json").then((m) => m.default),
    offers: () => import("./dictionaries/ar/offers.json").then((m) => m.default),
    products: () => import("./dictionaries/ar/products.json").then((m) => m.default),
    agenda: () => import("./dictionaries/ar/agenda.json").then((m) => m.default),
    orders: () => import("./dictionaries/ar/orders.json").then((m) => m.default),
    analytics: () => import("./dictionaries/ar/analytics.json").then((m) => m.default),
    workspace: () => import("./dictionaries/ar/workspace.json").then((m) => m.default),
    account: () => import("./dictionaries/ar/account.json").then((m) => m.default),
    billing: () => import("./dictionaries/ar/billing.json").then((m) => m.default),
    projects: () => import("./dictionaries/ar/projects.json").then((m) => m.default),
    tools: () => import("./dictionaries/ar/tools.json").then((m) => m.default),
    voice: () => import("./dictionaries/ar/voice.json").then((m) => m.default),
    storefront: () => import("./dictionaries/ar/storefront.json").then((m) => m.default),
    emails: () => import("./dictionaries/ar/emails.json").then((m) => m.default),
    errors: () => import("./dictionaries/ar/errors.json").then((m) => m.default),
    verticals: () => import("./dictionaries/ar/verticals.json").then((m) => m.default),
    journey: () => import("./dictionaries/ar/journey.json").then((m) => m.default),
    pageTemplates: () => import("./dictionaries/ar/pageTemplates.json").then((m) => m.default),
  },
};

export function getDictionary<N extends keyof Namespaces>(
  locale: Locale,
  namespace: N
): Promise<Namespaces[N]> {
  return loaders[locale][namespace]();
}
