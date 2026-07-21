import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const loaderPath = resolve(directory, "get-dictionary.ts");

test("every statically declared dictionary module exists", () => {
  const source = readFileSync(loaderPath, "utf8");
  const modulePaths = [
    ...source.matchAll(/(?:from|import\()\s*["'](\.\/dictionaries\/[^"']+\.json)["']/g),
  ].map((match) => match[1]);

  assert.ok(modulePaths.length > 0, "the dictionary loader should declare JSON modules");

  for (const modulePath of modulePaths) {
    assert.ok(
      existsSync(resolve(directory, modulePath)),
      `missing dictionary module referenced by get-dictionary.ts: ${modulePath}`
    );
  }
});
