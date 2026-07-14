import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public storefront loader is time-bounded and independent from window.load", async () => {
  const component = await readFile(new URL("./flux-loader.tsx", import.meta.url), "utf8");

  assert.match(component, /pathname\.startsWith\("\/p\/"\)/);
  assert.match(component, /STOREFRONT_SEQUENCE_MS\s*=\s*900/);
  assert.match(
    component,
    /if \(storefront\) \{\s*safetyTimer = window\.setTimeout\(finish, STOREFRONT_SEQUENCE_MS\)/s,
  );
  const storefrontBranch = component.match(/if \(storefront\) \{([\s\S]*?)\} else \{/);
  assert.ok(storefrontBranch, "the storefront must have its own dismissal branch");
  assert.doesNotMatch(storefrontBranch[1], /addEventListener\("load"/);
});

test("the root loading boundary does not wrap public storefronts", async () => {
  await assert.rejects(
    readFile(new URL("../app/loading.tsx", import.meta.url), "utf8"),
    { code: "ENOENT" },
  );
  const dashboardLoading = await readFile(
    new URL("../app/(app)/loading.tsx", import.meta.url),
    "utf8",
  );
  assert.match(dashboardLoading, /FluxRouteLoader/);
});
