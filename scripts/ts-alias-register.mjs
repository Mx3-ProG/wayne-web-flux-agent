import { registerHooks } from "node:module";

// Petit pont réservé aux scripts de vérification Node : l'application utilise
// l'alias TypeScript `@/`, que Node ne connaît pas nativement.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    const target = new URL(`../${specifier.slice(2)}.ts`, import.meta.url);
    return nextResolve(target.href, context);
  },
});
