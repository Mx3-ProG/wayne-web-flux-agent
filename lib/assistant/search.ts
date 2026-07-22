import { journeyState } from "@/lib/journey";
import { ASSISTANT_DESTINATIONS } from "./catalog";
import type {
  AssistantContext,
  AssistantDestination,
  AssistantSearchResult,
} from "./types";

export function normalizeAssistantText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

function tokenSimilarity(queryToken: string, candidateToken: string) {
  if (queryToken === candidateToken) return 1;
  if (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken)) return 0.88;
  if (queryToken.length < 4 || candidateToken.length < 4) return 0;
  const distance = editDistance(queryToken, candidateToken);
  return Math.max(0, 1 - distance / Math.max(queryToken.length, candidateToken.length));
}

function scoreDestination(query: string, destination: AssistantDestination) {
  const normalizedAliases = destination.aliases.map(normalizeAssistantText);
  const normalizedLabel = normalizeAssistantText(destination.label);
  const normalizedKeywords = destination.keywords.map(normalizeAssistantText);
  const fields = [normalizedLabel, ...normalizedAliases, ...normalizedKeywords];

  if (fields.some((field) => field === query)) return 1;
  if (normalizedAliases.some((alias) => alias.includes(query) || query.includes(alias))) return 0.94;
  if (normalizedLabel.includes(query) || query.includes(normalizedLabel)) return 0.91;

  const queryTokens = query.split(" ").filter((token) => token.length > 1);
  const candidateTokens = fields.flatMap((field) => field.split(" "));
  if (!queryTokens.length) return 0;
  const tokenScore = queryTokens.reduce((total, queryToken) => {
    const best = candidateTokens.reduce(
      (max, candidateToken) => Math.max(max, tokenSimilarity(queryToken, candidateToken)),
      0,
    );
    return total + best;
  }, 0) / queryTokens.length;

  const coverage = queryTokens.filter((queryToken) =>
    candidateTokens.some((candidateToken) => tokenSimilarity(queryToken, candidateToken) >= 0.72),
  ).length / queryTokens.length;
  return tokenScore * 0.72 + coverage * 0.28;
}

function allowedDestinations(
  context: AssistantContext,
  extraDestinations: AssistantDestination[] = [],
  catalog: AssistantDestination[] = ASSISTANT_DESTINATIONS,
) {
  const available = context.availableDestinationIds
    ? new Set(context.availableDestinationIds)
    : null;
  return [...extraDestinations, ...catalog].filter(
    (destination, index, all) =>
      destination.surfaces.includes(context.surface) &&
      (!available || available.has(destination.id)) &&
      all.findIndex((candidate) => candidate.id === destination.id) === index,
  );
}

export function searchAssistantDestinations(
  rawQuery: string,
  context: AssistantContext,
  extraDestinations: AssistantDestination[] = [],
  catalog: AssistantDestination[] = ASSISTANT_DESTINATIONS,
): AssistantSearchResult[] {
  const query = normalizeAssistantText(rawQuery);
  if (query.length < 2) return [];

  const nextStep = context.journey ? journeyState(context.journey).nextStep?.n : null;
  return allowedDestinations(context, extraDestinations, catalog)
    .map((destination) => {
      let score = scoreDestination(query, destination);
      if (nextStep && destination.journeyStep === nextStep) score += 0.06;
      return { destination, score: Math.min(score, 1) };
    })
    .filter(({ score }) => score >= 0.48)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ destination, score }) => ({
      destination,
      score,
      confidence: score >= 0.82 ? "high" : score >= 0.62 ? "medium" : "low",
    }));
}

export function suggestedAssistantDestination(
  context: AssistantContext,
  extraDestinations: AssistantDestination[] = [],
  catalog: AssistantDestination[] = ASSISTANT_DESTINATIONS,
) {
  const destinations = allowedDestinations(context, extraDestinations, catalog);
  if (context.journey) {
    const nextStep = journeyState(context.journey).nextStep?.n;
    const next = destinations.find((destination) => destination.journeyStep === nextStep);
    if (next) return next;
  }

  const routeMatch = destinations.find(
    (destination) => destination.href === context.pathname,
  );
  if (routeMatch) return routeMatch;
  return destinations.find((destination) =>
    context.surface === "marketing"
      ? destination.id === "marketing-start"
      : context.surface === "storefront"
        ? destination.id === "storefront-services"
        : destination.id === "app-home",
  ) ?? destinations[0] ?? null;
}
