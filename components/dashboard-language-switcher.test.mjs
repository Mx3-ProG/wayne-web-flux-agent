import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the dashboard language popover stays inside the mobile viewport", async () => {
  const styles = await readFile(
    new URL("dashboard-language-switcher.module.css", import.meta.url),
    "utf8",
  );

  assert.match(
    styles,
    /@media \(max-width: 979px\) \{[\s\S]*?\.popover \{[\s\S]*?position: fixed;[\s\S]*?inset-inline: 1rem;[\s\S]*?width: auto;/,
  );
  assert.match(styles, /max-height: calc\(100dvh - 6rem\);/);
  assert.match(styles, /overflow-y: auto;/);
});
