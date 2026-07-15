import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Checkout only mounts Elements supported by the runtime SDK", async () => {
  const route = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  const checkout = await readFile(
    new URL("../../../../components/checkout/custom-checkout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(route, /customer_update:\s*\{ address: "auto" as const \}/);
  assert.doesNotMatch(route, /tax_id_collection/);
  assert.doesNotMatch(checkout, /TaxIdElement/);
});
