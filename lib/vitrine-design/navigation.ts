// Règle commune à la bibliothèque, à l'éditeur et aux vitrines publiées.
// Deux liens peuvent rester visibles. Dès le troisième, le header utilise le
// menu burger, quelle que soit la largeur de l'écran.
export const STOREFRONT_NAV_INLINE_LINK_LIMIT = 2;

export function shouldCollapseStorefrontNavigation(linkCount: number): boolean {
  return linkCount > STOREFRONT_NAV_INLINE_LINK_LIMIT;
}
