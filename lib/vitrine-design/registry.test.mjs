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
  for (const theme of ["editorial", "studio", "local", "bold", "luxe", "minimal", "neon", "prestige"]) {
    assert.match(kits, new RegExp(`kit\\("${theme}"`));
  }
  const components = await readFile(new URL("components/catalog.ts", root), "utf8");
  assert.match(components, /button-smooth-flux/);
  assert.match(components, /checkout-future/);
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
