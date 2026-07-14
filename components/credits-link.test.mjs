import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("CreditsLink resolves its CSS module with every animation class", async () => {
  const componentUrl = new URL("./credits-link.tsx", import.meta.url);
  const component = await readFile(componentUrl, "utf8");
  const cssImport = component.match(/import styles from "(.+\.module\.css)";/);

  assert.ok(cssImport, "CreditsLink must import a colocated CSS module");

  const cssUrl = new URL(cssImport[1], componentUrl);
  await access(cssUrl);

  const css = await readFile(cssUrl, "utf8");
  const requiredClasses = [
    "link",
    "coinScene",
    "coinSceneBurst",
    "coinIcon",
    "coinParticle",
    "coinParticleOne",
    "coinParticleTwo",
    "coinParticleThree",
    "balance",
  ];

  for (const className of requiredClasses) {
    assert.match(css, new RegExp(`\\.${className}(?:[\\s:{,.]|$)`));
  }
});
