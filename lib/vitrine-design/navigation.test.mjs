import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  STOREFRONT_NAV_INLINE_LINK_LIMIT,
  shouldCollapseStorefrontNavigation,
} from "./navigation.ts";

test("two links remain inline and the third activates the burger", () => {
  assert.equal(STOREFRONT_NAV_INLINE_LINK_LIMIT, 2);
  assert.equal(shouldCollapseStorefrontNavigation(0), false);
  assert.equal(shouldCollapseStorefrontNavigation(1), false);
  assert.equal(shouldCollapseStorefrontNavigation(2), false);
  assert.equal(shouldCollapseStorefrontNavigation(3), true);
  assert.equal(shouldCollapseStorefrontNavigation(8), true);
});

test("the shared header exposes the library decision to responsive CSS", async () => {
  const root = new URL("../../components/vitrine/", import.meta.url);
  const header = await readFile(new URL("vitrine-header.tsx", root), "utf8");
  const styles = await readFile(new URL("vitrine.module.css", root), "utf8");
  assert.match(header, /shouldCollapseStorefrontNavigation\(nav\.items\.length\)/);
  assert.match(header, /data-navigation-collapsed=\{collapsed\}/);
  assert.match(styles, /data-navigation-collapsed="false"\] \.navLinks \{ display: flex; \}/);
  assert.match(styles, /data-navigation-collapsed="true"\] \.navBurger \{ display: grid; \}/);
  assert.doesNotMatch(styles, /@media \(min-width: 860px\)[\s\S]{0,160}\.navLinks/);
});

test("the internal editor fixture covers the three-link burger threshold", async () => {
  const fixture = await readFile(new URL("fixtures.ts", import.meta.url), "utf8");
  assert.match(fixture, /id: "story", label: "Notre histoire"/);
});
