import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the mobile bottom navigation exposes five items with the storefront third", async () => {
  const component = await readFile(new URL("app-navigation.tsx", import.meta.url), "utf8");
  const items = component.match(/const items: NavItem\[\] = \[([\s\S]*?)\n  \];/)?.[1];

  assert.ok(items, "the mobile navigation items must be declared");
  assert.deepEqual(
    [...items.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]),
    ["/espace", "/statistiques", "/ma-page", "/commandes", "/offres/configurer"],
  );
  assert.match(component, /data-nav-count=\{items\.length\}/);

  const styles = await readFile(new URL("app/(app)/app-shell.module.css", root), "utf8");
  assert.match(styles, /\.mobileNav \{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
});
