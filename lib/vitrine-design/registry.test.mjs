import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);

test("the storefront design registry covers every V1 surface", async () => {
  const types = await readFile(new URL("types.ts", root), "utf8");
  for (const slot of ["button", "navigation", "header", "footer", "section", "category", "product", "cart", "order", "booking", "legal", "checkout"]) {
    assert.match(types, new RegExp(`"${slot}"`));
  }
});

test("all historical themes and Smooth FLUX are registered", async () => {
  const kits = await readFile(new URL("kits/catalog.ts", root), "utf8");
  for (const theme of ["editorial", "studio", "local", "bold", "luxe", "minimal", "neon", "prestige", "performance-gt", "rosso-editorial", "maison-couture"]) {
    assert.match(kits, new RegExp(`kit\\("${theme}"`));
  }
  const components = await readFile(new URL("components/catalog.ts", root), "utf8");
  assert.match(components, /button-smooth-flux/);
  assert.match(components, /checkout-future/);
});

test("every universe is a complete visual preset", async () => {
  const kits = await readFile(new URL("kits/catalog.ts", root), "utf8");
  assert.equal((kits.match(/colors: \{/g) ?? []).length, 11);
  assert.equal((kits.match(/typography: \{/g) ?? []).length, 11);
  assert.equal((kits.match(/font: "/g) ?? []).length, 11);

  const resolver = await readFile(new URL("resolver.ts", root), "utf8");
  assert.match(resolver, /export function designKitPatch/);
  assert.match(resolver, /design: \{ kitId: kit\.id \}/);
});

test("guided and full editors apply the same complete kit patch", async () => {
  const guide = await readFile(new URL("../../components/editor/vitrine-guide.tsx", root), "utf8");
  const editor = await readFile(new URL("../../components/editor/page-editor.tsx", root), "utf8");
  assert.match(guide, /patch\(designKitPatch\(theme\.id, page\)\)/);
  assert.match(guide, /design: page\.design/);
  assert.match(editor, /patch\(designKitPatch\(theme\.id, page\)\)/);
  assert.match(editor, /patch\(designKitPatch\(kitId, page\)\)/);
});

test("dark color remains visible in guided preview and every dark storefront hero", async () => {
  const guideStyles = await readFile(new URL("../../components/commerce/setup-tunnel.module.css", root), "utf8");
  const storefrontStyles = await readFile(new URL("../../components/vitrine/vitrine.module.css", root), "utf8");
  for (const theme of ["studio", "luxe", "neon", "prestige", "performance-gt", "rosso-editorial"]) {
    assert.match(guideStyles, new RegExp(`data-theme="${theme}"[^}]*var\\(--preview-dark\\)`));
    assert.match(storefrontStyles, new RegExp(`data-theme="${theme}"\\] \\.hero[\\s\\S]{0,500}?var\\(--client-dark\\)`));
  }
});

test("Performance GT is selectable, responsive and accepted by Supabase", async () => {
  const types = await readFile(new URL("../types.ts", root), "utf8");
  const components = await readFile(new URL("components/catalog.ts", root), "utf8");
  const styles = await readFile(new URL("../../components/vitrine/vitrine.module.css", root), "utf8");
  const editorStyles = await readFile(new URL("../../components/editor/page-editor-redesign.module.css", root), "utf8");
  const migration = await readFile(new URL("../../supabase/migrations/00027_performance_gt_theme.sql", root), "utf8");
  assert.match(types, /"performance-gt"/);
  for (const id of ["button-performance", "navigation-performance", "header-performance", "footer-performance", "section-performance"]) {
    assert.match(components, new RegExp(id));
    assert.match(styles, new RegExp(id));
  }
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*header-performance/);
  assert.match(editorStyles, /data-theme="performance-gt"/);
  assert.match(migration, /'performance-gt'/);
});

test("Rosso Editorial is selectable, responsive and accepted by Supabase", async () => {
  const types = await readFile(new URL("../types.ts", root), "utf8");
  const components = await readFile(new URL("components/catalog.ts", root), "utf8");
  const styles = await readFile(new URL("../../components/vitrine/vitrine.module.css", root), "utf8");
  const guideStyles = await readFile(new URL("../../components/commerce/setup-tunnel.module.css", root), "utf8");
  const editorStyles = await readFile(new URL("../../components/editor/page-editor-redesign.module.css", root), "utf8");
  const migration = await readFile(new URL("../../supabase/migrations/00028_rosso_editorial_theme.sql", root), "utf8");
  assert.match(types, /"rosso-editorial"/);
  for (const id of ["button-orbit", "navigation-heritage", "header-heritage", "footer-editorial", "section-editorial-mosaic"]) {
    assert.match(components, new RegExp(id));
    assert.match(styles, new RegExp(id));
  }
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*header-heritage/);
  assert.match(guideStyles, /data-theme="rosso-editorial"/);
  assert.match(editorStyles, /data-theme="rosso-editorial"/);
  assert.match(migration, /'rosso-editorial'/);
});

test("Maison Couture is selectable, responsive and accepted by Supabase", async () => {
  const types = await readFile(new URL("../types.ts", root), "utf8");
  const components = await readFile(new URL("components/catalog.ts", root), "utf8");
  const styles = await readFile(new URL("../../components/vitrine/vitrine.module.css", root), "utf8");
  const guideStyles = await readFile(new URL("../../components/commerce/setup-tunnel.module.css", root), "utf8");
  const editorStyles = await readFile(new URL("../../components/editor/page-editor-redesign.module.css", root), "utf8");
  const migration = await readFile(new URL("../../supabase/migrations/00029_maison_couture_theme.sql", root), "utf8");
  assert.match(types, /"maison-couture"/);
  for (const id of ["button-couture", "navigation-maison", "header-campaign", "footer-maison", "section-collection-grid"]) {
    assert.match(components, new RegExp(id));
    assert.match(styles, new RegExp(id));
  }
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*header-campaign/);
  assert.match(guideStyles, /data-theme="maison-couture"/);
  assert.match(editorStyles, /data-theme="maison-couture"/);
  assert.match(migration, /'maison-couture'/);
});

test("guided preview exposes saved phone and WhatsApp state", async () => {
  const guide = await readFile(new URL("../../components/editor/vitrine-guide.tsx", root), "utf8");
  assert.match(guide, /vitrinePreviewContacts/);
  assert.match(guide, /page\.phone/);
  assert.match(guide, /WhatsApp activé/);
  assert.match(guide, /floating_cta: page\.floating_cta/);
  assert.match(guide, /!page\.floating_cta\.number \|\| page\.floating_cta\.number === page\.phone/);

  const editor = await readFile(new URL("../../components/editor/page-editor.tsx", root), "utf8");
  assert.match(editor, /!page\.floating_cta\.number \|\| page\.floating_cta\.number === page\.phone/);
});

test("every selectable component variant has a storefront renderer", async () => {
  const catalog = await readFile(new URL("components/catalog.ts", root), "utf8");
  const styles = await readFile(new URL("../../components/vitrine/vitrine.module.css", root), "utf8");
  const entries = [...catalog.matchAll(/base\("([^"]+)", "([^"]+)"/g)].map((match) => ({ slot: match[1], id: match[2] }));
  const counts = entries.reduce((result, entry) => result.set(entry.slot, (result.get(entry.slot) ?? 0) + 1), new Map());
  for (const entry of entries.filter((item) => (counts.get(item.slot) ?? 0) > 1)) {
    assert.match(styles, new RegExp(`data-design-${entry.slot}="${entry.id}"`), `${entry.id} has no renderer`);
  }
});

test("transparent navigation overrides every navigation skin", async () => {
  const styles = await readFile(new URL("../../components/vitrine/vitrine.module.css", root), "utf8");
  assert.match(styles, /\.storeNav:not\(\.navTransparent\)/);
  assert.match(styles, /\.page \.storeNav\.navTransparent/);
});

test("single-option design slots are informative instead of fake selectors", async () => {
  const editor = await readFile(new URL("../../components/editor/page-editor.tsx", root), "utf8");
  assert.match(editor, /entries\.length > 1/);
  assert.match(editor, /Seule variante disponible actuellement/);
});

test("legacy storefronts keep theme fallback and publication persists design", async () => {
  const resolver = await readFile(new URL("resolver.ts", root), "utf8");
  assert.match(resolver, /DESIGN_KIT_BY_ID\.get\(theme\)/);
  const migration = await readFile(new URL("../../supabase/migrations/00025_vitrine_design_registry.sql", root), "utf8");
  assert.match(migration, /add column if not exists design jsonb null/);
  assert.match(migration, /old\.draft \? 'design'/);
});

test("voice examples are internal catalog data, not user profile fields", async () => {
  const voices = await readFile(new URL("voices/catalog.ts", root), "utf8");
  assert.doesNotMatch(voices, /user_id|page_id|often_told|voice_profiles/);
});
