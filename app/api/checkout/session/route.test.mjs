import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Checkout can collect a tax ID for an existing Stripe customer", async () => {
  const route = await readFile(new URL("./route.ts", import.meta.url), "utf8");

  assert.match(route, /tax_id_collection:\s*\{ enabled: true \}/);
  assert.match(
    route,
    /customer_update:\s*\{ name: "auto" as const, address: "auto" as const \}/,
  );
});
